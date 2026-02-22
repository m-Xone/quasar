import io
import base64
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import markdown2


class PDFService:
    """Service for generating PDF reports from video summaries"""

    def __init__(self):
        """Initialize PDF service"""
        self.font_config = FontConfiguration()

    def _extract_embedded_images(self, summary: str) -> Tuple[str, List[Tuple[str, str]]]:
        """
        Extract embedded base64 images from markdown and return cleaned summary.

        Args:
            summary: Markdown with embedded base64 images

        Returns:
            Tuple of (cleaned_summary, list of (alt_text, base64_data))
        """
        # Pattern to match: ![alt text](data:image/jpeg;base64,...)
        pattern = r'!\[([^\]]*)\]\(data:image/[^;]+;base64,([^\)]+)\)'

        # Find all embedded images
        images = []
        for match in re.finditer(pattern, summary):
            alt_text = match.group(1)
            base64_data = match.group(2)
            images.append((alt_text, base64_data))

        # Remove embedded images from summary but keep the captions
        # This preserves the text structure while removing problematic base64 data
        cleaned = re.sub(pattern, r'[Image: \1]', summary)

        print(f"  Extracted {len(images)} embedded images from summary")

        return cleaned, images

    def _create_html_template(
        self,
        summary: str,
        metadata: dict,
        screenshots: Optional[List[str]] = None,
        embedded_images: Optional[List[Tuple[str, str]]] = None
    ) -> str:
        """
        Create HTML template for PDF generation.

        Args:
            summary: Markdown-formatted summary text
            metadata: Video metadata dictionary
            screenshots: List of base64-encoded screenshots
            embedded_images: List of (alt_text, base64_data) tuples from embedded images

        Returns:
            HTML string
        """
        # Convert markdown to HTML
        summary_html = markdown2.markdown(
            summary,
            extras=['tables', 'fenced-code-blocks', 'header-ids']
        )

        # Format metadata
        filename = metadata.get('filename', 'Unknown')
        duration = metadata.get('duration', 0)
        duration_str = f"{int(duration // 60)}:{int(duration % 60):02d}" if duration else "Unknown"
        source = metadata.get('source', 'upload')
        file_size_mb = metadata.get('size', 0) / (1024 * 1024) if metadata.get('size') else 0

        # Build screenshots HTML from embedded images
        screenshots_html = ""
        if embedded_images:
            screenshots_html = "<div class='screenshots'><h2>Key Moment Screenshots</h2>"
            for alt_text, img_base64 in embedded_images:
                screenshots_html += f"""
                <div class='screenshot'>
                    <img src='data:image/jpeg;base64,{img_base64}' alt='{alt_text}' />
                    <p class='screenshot-caption'>{alt_text}</p>
                </div>
                """
            screenshots_html += "</div>"
        elif screenshots:
            # Fallback to old screenshots parameter
            screenshots_html = "<div class='screenshots'><h2>Key Screenshots</h2>"
            for idx, img_base64 in enumerate(screenshots, 1):
                screenshots_html += f"""
                <div class='screenshot'>
                    <img src='data:image/png;base64,{img_base64}' alt='Screenshot {idx}' />
                    <p class='screenshot-caption'>Screenshot {idx}</p>
                </div>
                """
            screenshots_html += "</div>"

        # Create HTML document
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Video Summary Report</title>
            <style>
                @page {{
                    size: letter;
                    margin: 1in;
                    @bottom-center {{
                        content: "Page " counter(page) " of " counter(pages);
                        font-size: 10pt;
                        color: #666;
                    }}
                }}

                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 100%;
                }}

                .header {{
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }}

                h1 {{
                    color: #1e40af;
                    font-size: 24pt;
                    margin: 0 0 10px 0;
                }}

                .metadata {{
                    background: #f3f4f6;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    font-size: 10pt;
                }}

                .metadata-item {{
                    margin: 5px 0;
                }}

                .metadata-label {{
                    font-weight: bold;
                    color: #4b5563;
                    display: inline-block;
                    min-width: 100px;
                }}

                .summary {{
                    margin-bottom: 30px;
                }}

                .summary h2 {{
                    color: #1e40af;
                    font-size: 18pt;
                    margin-top: 25px;
                    margin-bottom: 15px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 8px;
                }}

                .summary h3 {{
                    color: #2563eb;
                    font-size: 14pt;
                    margin-top: 20px;
                    margin-bottom: 10px;
                }}

                .summary h4 {{
                    color: #3b82f6;
                    font-size: 12pt;
                    margin-top: 15px;
                    margin-bottom: 8px;
                }}

                .summary p {{
                    margin: 10px 0;
                    text-align: justify;
                }}

                .summary ul, .summary ol {{
                    margin: 10px 0;
                    padding-left: 25px;
                }}

                .summary li {{
                    margin: 5px 0;
                }}

                .summary strong {{
                    color: #1f2937;
                }}

                .summary code {{
                    background: #f3f4f6;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                    font-size: 9pt;
                }}

                .summary img {{
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 15px auto;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    page-break-inside: avoid;
                }}

                .summary em {{
                    display: block;
                    text-align: center;
                    color: #6b7280;
                    font-size: 9pt;
                    margin: 5px 0 15px 0;
                }}

                .screenshots {{
                    page-break-before: always;
                    margin-top: 30px;
                }}

                .screenshots h2 {{
                    color: #1e40af;
                    font-size: 18pt;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 8px;
                }}

                .screenshot {{
                    margin: 20px 0;
                    text-align: center;
                    page-break-inside: avoid;
                }}

                .screenshot img {{
                    max-width: 100%;
                    height: auto;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}

                .screenshot-caption {{
                    font-size: 10pt;
                    color: #6b7280;
                    margin-top: 8px;
                    font-style: italic;
                }}

                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 9pt;
                    color: #6b7280;
                    text-align: center;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Video Summary Report</h1>
                <p style="color: #6b7280; font-size: 10pt; margin: 5px 0;">
                    Generated on {datetime.now().strftime("%B %d, %Y at %I:%M %p")}
                </p>
            </div>

            <div class="metadata">
                <div class="metadata-item">
                    <span class="metadata-label">Filename:</span>
                    <span>{filename}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Duration:</span>
                    <span>{duration_str}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Source:</span>
                    <span>{source.title()}</span>
                </div>
                {f'<div class="metadata-item"><span class="metadata-label">File Size:</span><span>{file_size_mb:.2f} MB</span></div>' if file_size_mb > 0 else ''}
            </div>

            <div class="summary">
                {summary_html}
            </div>

            {screenshots_html}

            <div class="footer">
                <p>Generated by Video Summarizer - Powered by Google Gemini AI</p>
            </div>
        </body>
        </html>
        """

        return html

    def generate_pdf(
        self,
        summary: str,
        metadata: dict,
        screenshots: Optional[List[str]] = None,
        output_path: Optional[str] = None
    ) -> bytes:
        """
        Generate PDF from video summary.

        Args:
            summary: Markdown-formatted summary text
            metadata: Video metadata dictionary
            screenshots: List of base64-encoded screenshots
            output_path: Optional path to save PDF file

        Returns:
            PDF content as bytes
        """
        try:
            print(f"Generating PDF - Summary length: {len(summary)} chars")
            print(f"Contains embedded images: {'![Screenshot' in summary}")

            # Extract embedded base64 images from summary
            # This prevents WeasyPrint from choking on the inline images
            cleaned_summary, embedded_images = self._extract_embedded_images(summary)

            # Create HTML with cleaned summary and images in a separate section
            html_content = self._create_html_template(
                cleaned_summary,
                metadata,
                screenshots,
                embedded_images
            )

            print(f"HTML content generated - Length: {len(html_content)} chars")

            # Generate PDF
            pdf_bytes = HTML(string=html_content).write_pdf(
                font_config=self.font_config
            )

            print(f"PDF generated successfully - Size: {len(pdf_bytes)} bytes")

            # Save to file if path provided
            if output_path:
                with open(output_path, 'wb') as f:
                    f.write(pdf_bytes)
                print(f"PDF saved to: {output_path}")

            return pdf_bytes

        except Exception as e:
            print(f"ERROR generating PDF: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to generate PDF: {str(e)}")

    def generate_pdf_from_file(
        self,
        summary_file: str,
        metadata: dict,
        screenshots: Optional[List[str]] = None,
        output_path: Optional[str] = None
    ) -> bytes:
        """
        Generate PDF from a summary file.

        Args:
            summary_file: Path to markdown file with summary
            metadata: Video metadata dictionary
            screenshots: List of base64-encoded screenshots
            output_path: Optional path to save PDF file

        Returns:
            PDF content as bytes
        """
        with open(summary_file, 'r', encoding='utf-8') as f:
            summary = f.read()

        return self.generate_pdf(summary, metadata, screenshots, output_path)

import io
import base64
import re
from datetime import datetime
from typing import List, Optional, Tuple
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as RLImage
from reportlab.lib.colors import HexColor
from io import BytesIO
from PIL import Image as PILImage


class PDFServiceSimple:
    """Simple PDF service using ReportLab directly (Python 3.13 compatible)"""

    def __init__(self):
        """Initialize PDF service"""
        self.styles = getSampleStyleSheet()
        self._setup_styles()

    def _setup_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=HexColor('#1e40af'),
            spaceAfter=20,
            alignment=TA_LEFT
        ))

        # Heading 2 style
        self.styles.add(ParagraphStyle(
            name='CustomHeading2',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=HexColor('#2563eb'),
            spaceAfter=12,
            spaceBefore=20,
            alignment=TA_LEFT
        ))

        # Body style
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['BodyText'],
            fontSize=11,
            leading=16,
            spaceAfter=10,
            alignment=TA_LEFT
        ))

        # Caption style
        self.styles.add(ParagraphStyle(
            name='Caption',
            parent=self.styles['BodyText'],
            fontSize=9,
            textColor=HexColor('#6b7280'),
            alignment=TA_CENTER,
            spaceAfter=15
        ))

    def _extract_embedded_images(self, summary: str) -> Tuple[str, List[Tuple[str, str]]]:
        """Extract embedded base64 images from markdown"""
        pattern = r'!\[([^\]]*)\]\(data:image/[^;]+;base64,([^\)]+)\)'
        images = []
        for match in re.finditer(pattern, summary):
            alt_text = match.group(1)
            base64_data = match.group(2)
            images.append((alt_text, base64_data))

        # Replace images with text markers
        cleaned = re.sub(pattern, r'[📷 Image: \1]', summary)
        print(f"  Extracted {len(images)} embedded images from summary")
        return cleaned, images

    def _markdown_to_flowables(self, markdown_text: str):
        """Convert markdown text to ReportLab flowables"""
        flowables = []
        lines = markdown_text.split('\n')

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            if not line:
                flowables.append(Spacer(1, 0.1 * inch))
                i += 1
                continue

            # Heading 2
            if line.startswith('## '):
                text = line[3:].strip()
                flowables.append(Spacer(1, 0.2 * inch))
                flowables.append(Paragraph(text, self.styles['CustomHeading2']))

            # Heading 3
            elif line.startswith('### '):
                text = line[4:].strip()
                flowables.append(Spacer(1, 0.15 * inch))
                flowables.append(Paragraph(f"<b>{text}</b>", self.styles['CustomBody']))

            # Bullet list
            elif line.startswith('- ') or line.startswith('* '):
                text = line[2:].strip()
                # Handle bold **text**
                text = re.sub(r'\*\*([^\*]+)\*\*', r'<b>\1</b>', text)
                # Handle italic *text*
                text = re.sub(r'\*([^\*]+)\*', r'<i>\1</i>', text)
                flowables.append(Paragraph(f"• {text}", self.styles['CustomBody']))

            # Regular paragraph
            else:
                # Handle bold **text**
                text = re.sub(r'\*\*([^\*]+)\*\*', r'<b>\1</b>', line)
                # Handle italic *text*
                text = re.sub(r'\*([^\*]+)\*', r'<i>\1</i>', text)
                flowables.append(Paragraph(text, self.styles['CustomBody']))

            i += 1

        return flowables

    def _base64_to_image(self, base64_data: str, max_width: float = 5.5 * inch):
        """Convert base64 string to ReportLab Image"""
        try:
            # Decode base64 to bytes
            img_data = base64.b64decode(base64_data)

            # Open with PIL to get dimensions
            pil_img = PILImage.open(BytesIO(img_data))
            width, height = pil_img.size

            # Calculate scaled dimensions
            aspect = height / width
            if width > max_width:
                new_width = max_width
                new_height = max_width * aspect
            else:
                new_width = width / 72  # Convert pixels to inches (rough)
                new_height = height / 72

            # Create ReportLab image
            img_buffer = BytesIO(img_data)
            img = RLImage(img_buffer, width=new_width, height=new_height)

            return img
        except Exception as e:
            print(f"  Error creating image: {e}")
            return None

    def generate_pdf(
        self,
        summary: str,
        metadata: dict,
        screenshots: Optional[List[str]] = None,
        output_path: Optional[str] = None
    ) -> bytes:
        """
        Generate PDF from video summary using ReportLab.

        Args:
            summary: Markdown-formatted summary text
            metadata: Video metadata dictionary
            screenshots: List of base64-encoded screenshots (ignored)
            output_path: Optional path to save PDF file

        Returns:
            PDF content as bytes
        """
        try:
            print(f"Generating PDF with ReportLab - Summary length: {len(summary)} chars")

            # Extract embedded images
            cleaned_summary, embedded_images = self._extract_embedded_images(summary)

            # Create PDF buffer
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=72
            )

            # Build content
            story = []

            # Title
            story.append(Paragraph("Video Summary Report", self.styles['CustomTitle']))
            story.append(Paragraph(
                f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
                self.styles['Caption']
            ))
            story.append(Spacer(1, 0.3 * inch))

            # Metadata
            filename = metadata.get('filename', 'Unknown')
            duration = metadata.get('duration', 0)
            duration_str = f"{int(duration // 60)}:{int(duration % 60):02d}" if duration else "Unknown"
            source = metadata.get('source', 'upload')

            story.append(Paragraph("<b>Video Information</b>", self.styles['CustomHeading2']))
            story.append(Paragraph(f"<b>Filename:</b> {filename}", self.styles['CustomBody']))
            story.append(Paragraph(f"<b>Duration:</b> {duration_str}", self.styles['CustomBody']))
            story.append(Paragraph(f"<b>Source:</b> {source.title()}", self.styles['CustomBody']))
            story.append(Spacer(1, 0.3 * inch))

            # Summary content
            story.extend(self._markdown_to_flowables(cleaned_summary))

            # Add images if any
            if embedded_images:
                story.append(PageBreak())
                story.append(Paragraph("Key Moment Screenshots", self.styles['CustomHeading2']))
                story.append(Spacer(1, 0.2 * inch))

                for alt_text, base64_data in embedded_images:
                    img = self._base64_to_image(base64_data)
                    if img:
                        story.append(img)
                        story.append(Paragraph(alt_text, self.styles['Caption']))
                        story.append(Spacer(1, 0.3 * inch))

            # Build PDF
            doc.build(story)

            # Get PDF bytes
            pdf_bytes = buffer.getvalue()
            buffer.close()

            print(f"PDF generated successfully - Size: {len(pdf_bytes)} bytes")

            # Save to file if path provided
            if output_path:
                with open(output_path, 'wb') as f:
                    f.write(pdf_bytes)
                print(f"PDF saved to: {output_path}")

            return pdf_bytes

        except Exception as e:
            print(f"ERROR generating PDF: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to generate PDF: {str(e)}")

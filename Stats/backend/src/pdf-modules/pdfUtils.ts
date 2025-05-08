import PDFKit from 'pdfkit';

// Define interfaces for chart data
export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

export interface BarChartData {
  label: string;
  value: number;
  color: string;
}

// Define our custom PDFKit type
export type CustomPDFKit = PDFKit.PDFDocument & {
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): PDFKit.PDFDocument;
  addPage(): PDFKit.PDFDocument;
  page: PDFKit.PDFPage;
  fontSize(size: number): PDFKit.PDFDocument;
  font(font: string): PDFKit.PDFDocument;
  text(text: string, x?: number, y?: number, options?: PDFKit.Mixins.TextOptions): PDFKit.PDFDocument;
  text(text: string, options?: PDFKit.Mixins.TextOptions): PDFKit.PDFDocument;
  moveDown(lines?: number): PDFKit.PDFDocument;
  rect(x: number, y: number, width: number, height: number): PDFKit.PDFDocument;
  fillColor(color: string): PDFKit.PDFDocument;
  fill(): PDFKit.PDFDocument;
  save(): PDFKit.PDFDocument;
  restore(): PDFKit.PDFDocument;
  moveTo(x: number, y: number): PDFKit.PDFDocument;
  lineTo(x: number, y: number): PDFKit.PDFDocument;
  lineWidth(width: number): PDFKit.PDFDocument;
  translate(x: number, y: number): PDFKit.PDFDocument;
  widthOfString(text: string): number;
  y: number;
  x: number;
  image(src: string | Buffer, x?: number, y?: number, options?: PDFKit.Mixins.ImageOption): PDFKit.PDFDocument;
  image(src: string | Buffer, options?: PDFKit.Mixins.ImageOption): PDFKit.PDFDocument;
};

// Function to add header to each page (for all pages except the first)
export const addHeader = (doc: CustomPDFKit) => {
  // Draw background rectangle for header
  doc.save()  // Save graphics state
     .fillColor('#F5F5F5')  // Light gray background
     .rect(0, 0, doc.page.width, 60)  // Rectangle from top of page
     .fill()
     .restore();  // Restore graphics state

  // Add header text
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#800000')  // Dark red color
     .text('Programa RLT y CLT', 40, 20)
     .text('Informe Encuesta de Ambiente Escolar', doc.page.width - 240, 20, {
       width: 200,
       align: 'right'
     })
     .fillColor('#000000');  // Reset to black for remaining content
  
  doc.moveDown(2); // Space after header

  // Keep footer margin setup without page numbers
  doc.page.margins.bottom = 30;  // Ensure space for footer
};

// Function to draw a pie chart
export function drawPieChart(
  doc: CustomPDFKit,
  data: PieChartData[],
  centerX: number,
  centerY: number,
  radius: number,
  title: string,
  isFirstChart: boolean = false,
  legendBelow: boolean = false,
  multiLineLegend: boolean = false
) {
  try {
    let currentAngle = 0;
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Draw title
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('black')  // Set color to black
       .text(title, centerX - radius, centerY - radius - 25, {
         width: radius * 2,
         align: 'center'
       });

    // Draw pie segments with percentages
    data.forEach(item => {
      const segmentAngle = (item.value / total) * 2 * Math.PI;
      const percentage = Math.round((item.value / total) * 100);
      
      // Draw segment
      doc.save()
         .moveTo(centerX, centerY)
         .arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
         .lineTo(centerX, centerY)
         .fillColor(item.color)
         .fill();

      // Calculate position for percentage text
      const midAngle = currentAngle + (segmentAngle / 2);
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(midAngle) * textRadius;
      const textY = centerY + Math.sin(midAngle) * textRadius;

      // Draw percentage with white text
      if (percentage > 3) {
        doc.fillColor('white')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(`${percentage}%`, 
             textX - 12,
             textY - 5,
             {
               width: 24,
               align: 'center'
             });
      }
      
      doc.restore();
      currentAngle += segmentAngle;
    });

    // Add legend
    const legendBoxSize = 8;
    const legendTextPadding = 5;
    let legendX: number;
    let legendY: number;

    if (legendBelow) {
      // Place legend below the chart
      legendX = multiLineLegend ? 
        (centerX - radius - 30) :  // Original position for pie chart 3's legend
        (centerX - radius + 12);   // Reduced from +30 to +15 to move legend more left
      legendY = centerY + radius + 10;  // 10 points padding below chart
      
      if (multiLineLegend) {
        // Calculate items per row (3 rows for grades)
        const itemsPerRow = Math.ceil(data.length / 3);
        const rowSpacing = 15;  // Space between rows
        
        data.forEach((item, index) => {
          const row = Math.floor(index / itemsPerRow);
          const col = index % itemsPerRow;
          const currentX = legendX + (col * 60);  // Keep 60 points spacing between items
          const currentY = legendY + (row * rowSpacing);  // 15 points between rows

          // Color box
          doc.rect(currentX, currentY, legendBoxSize, legendBoxSize)
             .fillColor(item.color)
             .fill();

          // Label
          doc.fillColor('black')
             .fontSize(8)
             .font('Helvetica')
             .text(item.label,
               currentX + legendBoxSize + legendTextPadding,
               currentY,
               {
                 width: 45,
                 align: 'left'
               });
        });
      } else {
        // Two-line layout for schedule pie chart
        const itemsPerRow = Math.ceil(data.length / 2);  // Split items into 2 rows
        const rowSpacing = 15;  // Space between rows
        
        data.forEach((item, index) => {
          const row = Math.floor(index / itemsPerRow);
          const col = index % itemsPerRow;
          const currentX = legendX + (col * 60);  // Keep 60 points spacing between items
          const currentY = legendY + (row * rowSpacing);  // 15 points between rows

          // Color box
          doc.rect(currentX, currentY, legendBoxSize, legendBoxSize)
             .fillColor(item.color)
             .fill();

          // Label
          doc.fillColor('black')
             .fontSize(8)
             .font('Helvetica')
             .text(item.label,
               currentX + legendBoxSize + legendTextPadding,
               currentY,
               {
                 width: 45,
                 align: 'left'
               });
        });
      }
    } else {
      // Original right-side legend placement
      legendX = centerX + radius + 20;
      legendY = centerY - radius;
      
      data.forEach(item => {
        // Color box
        doc.rect(legendX, legendY, legendBoxSize, legendBoxSize)
           .fillColor(item.color)
           .fill();

        // Label
        doc.fillColor('black')
           .fontSize(8)
           .font('Helvetica')
           .text(item.label,
             legendX + legendBoxSize + legendTextPadding,
             legendY,
             {
               width: 80,
               align: 'left'
             });

        legendY += legendBoxSize + 10;
      });
    }
  } catch (error) {
    console.error('Error drawing pie chart:', error);
  }
}

// Function to draw a bar chart
export function drawBarChart(
  doc: CustomPDFKit,
  data: BarChartData[],
  startX: number,
  startY: number,
  width: number,
  height: number,
  title: string,
  isHorizontal: boolean = true
) {
  try {
    console.log('drawBarChart called with:', {
      data,
      position: { startX, startY, width, height },
      title,
      isHorizontal
    });

    // Adjust padding based on whether it's the feedback chart (which needs more label space)
    const isFeedbackChart = title.includes('retroalimentación');
    const padding = { 
      top: 35,  // Increased from 25 to 35 to add more space between title and chart
      right: 10, 
      bottom: 30, 
      left: isFeedbackChart ? 100 : 60
    };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...data.map(d => d.value), 1); // Ensure maxValue is at least 1 to avoid division by zero
    
    console.log('Chart calculations:', {
      padding,
      chartWidth,
      chartHeight,
      maxValue
    });

    // Draw title with more space between it and the chart
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('black')  // Added this line to ensure title is black
       .text(title, startX, startY + 5, {
         width: width,
         align: 'center'
       });

    if (isHorizontal) {
      // Draw horizontal bars with adjusted starting position
      const barHeight = Math.min(15, (chartHeight - (data.length - 1) * 5) / data.length);
      const barSpacing = barHeight + 5;

      console.log('Bar dimensions:', {
        barHeight,
        barSpacing,
        numberOfBars: data.length
      });

      data.forEach((item, index) => {
        const barWidth = (item.value / maxValue) * chartWidth;
        const barY = startY + padding.top + index * barSpacing;
        const barX = startX + padding.left;

        console.log(`Drawing bar ${index}:`, {
          label: item.label,
          value: item.value,
          position: { barX, barY, barWidth, barHeight }
        });

        // Draw label with more space and no text wrapping for feedback chart
        doc.fontSize(8)
           .fillColor('black')
           .text(item.label, 
                startX + 5, 
                barY + (barHeight / 2) - 4,
                { 
                  width: padding.left - 10, 
                  align: 'right',
                  lineBreak: !isFeedbackChart  // Disable line breaks for feedback chart
                });

        // Draw bar
        doc.rect(barX, barY, barWidth || 1, barHeight)  // Use minimum width of 1 for zero values
           .fillColor(item.color)
           .fill();

        // Draw value
        doc.fontSize(8)
           .fillColor('black')
           .text(item.value.toString(),
                barX + (barWidth || 1) + 5,  // Adjust text position based on bar width
                barY + (barHeight / 2) - 4);
      });
    } else {
      // Vertical bars implementation remains unchanged
      const barWidth = (width - (data.length + 1) * 5) / data.length;
      
      data.forEach((item, index) => {
        const barHeight = (item.value / maxValue) * (height - 40);
        const barX = startX + 5 + index * (barWidth + 5);
        const barY = startY + (height - 40) - barHeight;

        doc.rect(barX, barY, barWidth, barHeight || 1)  // Use minimum height of 1 for zero values
           .fillColor(item.color)
           .fill();

        doc.fontSize(8)
           .fillColor('black')
           .text(item.label, barX, startY + height - 35, {
             width: barWidth,
             align: 'center'
           });

        doc.fontSize(8)
           .text(item.value.toString(), barX, barY - 10, {
             width: barWidth,
             align: 'center'
           });
      });
    }
  } catch (error) {
    console.error('Error drawing bar chart:', error);
  }
} 
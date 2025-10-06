const PDFDocument = require('pdfkit');

class PDFGenerator {
  generateAttendanceReport(meeting) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header - clearer font and spacing
        doc.fontSize(22).fillColor('#111827').text('Attendance Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#374151').text(`Meeting: ${meeting.title}`, { align: 'center' });
        doc.text(`Date: ${new Date(meeting.start_time).toLocaleDateString()}`, { align: 'center' });
        doc.text(`Duration: ${meeting.total_duration || 0} minutes`, { align: 'center' });
        doc.moveDown(2);

        // Summary statistics
        const presentCount = (meeting.attendance || []).filter(p => p.attendanceStatus === 'Present').length;
        const partialCount = (meeting.attendance || []).filter(p => p.attendanceStatus === 'Partial').length;
        const absentCount = (meeting.attendance || []).filter(p => p.attendanceStatus === 'Absent').length;

        doc.fontSize(14).fillColor('#333333').text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.fillColor('#4CAF50').text(`Present (≥75%): ${presentCount}`);
        doc.fillColor('#FFC107').text(`Partial (50-74%): ${partialCount}`);
        doc.fillColor('#F44336').text(`Absent (<50%): ${absentCount}`);
        doc.fillColor('#333333').text(`Total Participants: ${(meeting.attendance || []).length}`);
        doc.moveDown(2);

        // Table header
        doc.fontSize(12).fillColor('#333333').text('Participant Details', { underline: true });
        doc.moveDown(1);

        const tableTop = doc.y;
        // 5 columns: Name (35%), Presence % (15%), Status (20%), Color (10%), Current Year (20%)
        const totalWidth = 530;
        const colWidths = [
          Math.round(totalWidth * 0.35),
          Math.round(totalWidth * 0.15),
          Math.round(totalWidth * 0.2),
          Math.round(totalWidth * 0.1),
          Math.round(totalWidth * 0.2)
        ];
        const tableHeaders = ['Name', 'Attendance %', 'Status', '', 'Current Year'];
        const startX = 50;

        // Draw header row background
        doc.fontSize(10).fillColor('#FFFFFF');
        doc.rect(startX, tableTop, 530, 25).fill('#1F2937');

        let xPos = startX + 5;
        tableHeaders.forEach((header, i) => {
          doc.text(header, xPos, tableTop + 7, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });

        // Rows with padding
        let yPos = tableTop + 25;
        doc.fontSize(9);

        (meeting.attendance || []).forEach((participant, index) => {
          const rowColor = index % 2 === 0 ? '#F7FAFC' : '#FFFFFF';
          doc.rect(startX, yPos, 530, 25).fill(rowColor);

          xPos = startX + 5;

          // Name (left-aligned)
          doc.fillColor('#333333').text(participant.name || '', xPos, yPos + 7, { width: colWidths[0], align: 'left', ellipsis: true });
          xPos += colWidths[0];

          // Percentage (right-aligned, 2 decimals)
          const total = meeting.total_duration || 0;
          const rawPct = total > 0 ? ((participant.duration || 0) / total) * 100 : (participant.attendancePercentage || 0);
          const clampedPct = Math.max(0, Math.min(100, isFinite(rawPct) ? rawPct : 0));
          const pctText = `${clampedPct.toFixed(2)}%`;
          doc.fillColor('#333333').text(pctText, xPos, yPos + 7, { width: colWidths[1], align: 'right' });
          xPos += colWidths[1];

          // Status: Present or Absent; color follows thresholds (green/yellow/red)
          const displayStatus = clampedPct >= 50 ? 'Present' : 'Absent';
          const statusColor = clampedPct >= 75 ? '#4CAF50' : (clampedPct >= 50 ? '#FFC107' : '#F44336');
          // Draw pill background
          const pillHeight = 16;
          const pillWidth = Math.min(colWidths[2] - 20, 80);
          const pillX = xPos + 10;
          const pillY = yPos + 5;
          doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 8).fill(statusColor);
          doc.fillColor('#FFFFFF').fontSize(9).text(displayStatus, pillX, pillY + 3, { width: pillWidth, align: 'center' });
          // Reset font size for next cells
          doc.fontSize(9);
          xPos += colWidths[2];

          // Color indicator cell: small circle
          const centerX = xPos + Math.floor(colWidths[3] / 2) - 6;
          const centerY = yPos + 7;
          doc.fillColor(statusColor).circle(centerX + 6, centerY + 6, 6).fill();
          xPos += colWidths[3];

          // Current Year (centered)
          const yearText = (participant.currentYear !== undefined && participant.currentYear !== null) ? String(participant.currentYear) : '-';
          doc.fillColor('#333333').text(yearText, xPos, yPos + 7, { width: colWidths[4], align: 'center' });
          
          yPos += 25;
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }
        });

        // Footer
        doc.fontSize(8).fillColor('#999999');
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 50, { align: 'center' });

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;



const { jsPDF } = require("jspdf");

exports.doc = () => {
    return new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });
};

exports.generatePdfTable = (title, headers, colWidths, rows) => {
    const pdf = exports.doc();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(title, 14, 18);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 25);

    pdf.setLineWidth(0.5);
    pdf.line(14, 28, 196, 28);

    let y = 36;
    const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);

    const renderHeader = (currentY) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setFillColor(235, 240, 248);
        pdf.rect(14, currentY - 5, totalTableWidth, 8, "F");

        let x = 16;
        headers.forEach((h, idx) => {
            pdf.text(String(h), x, currentY);
            x += colWidths[idx];
        });
    };

    renderHeader(y);
    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    rows.forEach((row, rowIndex) => {
        if (y > 270) {
            pdf.addPage();
            y = 20;
            renderHeader(y);
            y += 8;
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
        }

        if (rowIndex % 2 === 1) {
            pdf.setFillColor(250, 250, 252);
            pdf.rect(14, y - 5, totalTableWidth, 7, "F");
        }

        let rX = 16;
        row.forEach((cell, idx) => {
            const cellStr = String(cell ?? "-");
            const maxChars = Math.floor(colWidths[idx] / 2.2);
            const truncated = cellStr.length > maxChars ? cellStr.substring(0, maxChars - 2) + ".." : cellStr;
            pdf.text(truncated, rX, y);
            rX += colWidths[idx];
        });

        y += 7;
    });

    return Buffer.from(pdf.output("arraybuffer"));
};
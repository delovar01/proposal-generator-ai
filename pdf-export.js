/*
 * pdf-export.js — exports the rendered proposal DOM to a PDF via jsPDF + html2canvas.
 * Using html2canvas keeps Cyrillic and custom typography pixel-perfect without
 * needing to embed a Unicode font in jsPDF.
 */

(function (global) {
  'use strict';

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MARGIN_MM = 12;

  async function exportProposalToPDF(proposalEl, fileName) {
    if (!proposalEl) throw new Error('Proposal element is missing.');
    if (!global.jspdf || !global.jspdf.jsPDF) {
      throw new Error('jsPDF library has not finished loading yet.');
    }
    if (!global.html2canvas) {
      throw new Error('html2canvas library has not finished loading yet.');
    }

    const { jsPDF } = global.jspdf;

    // Render the proposal DOM to a high-res canvas.
    const canvas = await global.html2canvas(proposalEl, {
      scale: 2,
      backgroundColor: '#f7f8fb',
      useCORS: true,
      logging: false,
      windowWidth: proposalEl.scrollWidth,
      windowHeight: proposalEl.scrollHeight
    });

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true
    });

    const pageWidth = A4_WIDTH_MM - MARGIN_MM * 2;
    const pageHeight = A4_HEIGHT_MM - MARGIN_MM * 2;

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // If the image fits on a single page, just add it.
    if (imgHeight <= pageHeight) {
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', MARGIN_MM, MARGIN_MM, imgWidth, imgHeight);
      pdf.save(fileName);
      return;
    }

    // Otherwise split the canvas into slices matching A4 pages.
    const pxPerMm = canvas.width / imgWidth;
    const sliceHeightPx = Math.floor(pageHeight * pxPerMm);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    const ctx = sliceCanvas.getContext('2d');

    let offsetY = 0;
    let pageIndex = 0;

    while (offsetY < canvas.height) {
      const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - offsetY);
      sliceCanvas.height = currentSliceHeight;

      ctx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.fillStyle = '#f7f8fb';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0, offsetY, canvas.width, currentSliceHeight,
        0, 0, sliceCanvas.width, currentSliceHeight
      );

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const sliceMmHeight = currentSliceHeight / pxPerMm;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(sliceData, 'JPEG', MARGIN_MM, MARGIN_MM, imgWidth, sliceMmHeight);

      offsetY += currentSliceHeight;
      pageIndex += 1;
    }

    pdf.save(fileName);
  }

  global.PDFExport = { exportProposalToPDF };
})(window);

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface InvoiceData {
  invoiceNumber: string;
  clientName: string;
  clientAddress?: string;
  clientPhone: string;
  clientGST?: string;
  issueDate: string;
  dueDate?: string;
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gst?: string;
  logo?: string;
}

export class PDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  generateInvoice(invoiceData: InvoiceData, companyInfo: CompanyInfo): jsPDF {
    this.doc = new jsPDF();
    let yPosition = this.margin;

    // Header
    yPosition = this.addHeader(companyInfo, yPosition);
    yPosition += 10;

    // Invoice details
    yPosition = this.addInvoiceDetails(invoiceData, yPosition);
    yPosition += 10;

    // Client details
    yPosition = this.addClientDetails(invoiceData, yPosition);
    yPosition += 15;

    // Items table
    yPosition = this.addItemsTable(invoiceData, yPosition);
    yPosition += 10;

    // Totals
    yPosition = this.addTotals(invoiceData, yPosition);
    yPosition += 15;

    // Notes and footer
    this.addNotesAndFooter(invoiceData, yPosition);

    return this.doc;
  }

  private addHeader(companyInfo: CompanyInfo, yPosition: number): number {
    // Company name
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(companyInfo.name, this.margin, yPosition);
    yPosition += 10;

    // Company details
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(companyInfo.address, this.margin, yPosition);
    yPosition += 5;
    this.doc.text(`Phone: ${companyInfo.phone} | Email: ${companyInfo.email}`, this.margin, yPosition);
    yPosition += 5;
    
    if (companyInfo.gst) {
      this.doc.text(`GST: ${companyInfo.gst}`, this.margin, yPosition);
      yPosition += 5;
    }

    // Invoice title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INVOICE', this.pageWidth - this.margin - 30, yPosition - 20);

    return yPosition;
  }

  private addInvoiceDetails(invoiceData: InvoiceData, yPosition: number): number {
    const rightX = this.pageWidth - this.margin - 60;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Invoice Number:', rightX, yPosition);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(invoiceData.invoiceNumber, rightX + 35, yPosition);
    yPosition += 5;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Issue Date:', rightX, yPosition);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(invoiceData.issueDate, rightX + 25, yPosition);
    yPosition += 5;

    if (invoiceData.dueDate) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Due Date:', rightX, yPosition);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(invoiceData.dueDate, rightX + 25, yPosition);
      yPosition += 5;
    }

    return yPosition;
  }

  private addClientDetails(invoiceData: InvoiceData, yPosition: number): number {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bill To:', this.margin, yPosition);
    yPosition += 7;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(invoiceData.clientName, this.margin, yPosition);
    yPosition += 5;

    this.doc.setFont('helvetica', 'normal');
    if (invoiceData.clientAddress) {
      const addressLines = this.doc.splitTextToSize(invoiceData.clientAddress, 80);
      this.doc.text(addressLines, this.margin, yPosition);
      yPosition += addressLines.length * 5;
    }

    this.doc.text(`Phone: ${invoiceData.clientPhone}`, this.margin, yPosition);
    yPosition += 5;

    if (invoiceData.clientGST) {
      this.doc.text(`GST: ${invoiceData.clientGST}`, this.margin, yPosition);
      yPosition += 5;
    }

    return yPosition;
  }

  private addItemsTable(invoiceData: InvoiceData, yPosition: number): number {
    const tableStartY = yPosition;
    const colWidths = [80, 25, 30, 35];
    const colX = [this.margin, this.margin + colWidths[0], this.margin + colWidths[0] + colWidths[1], this.margin + colWidths[0] + colWidths[1] + colWidths[2]];

    // Table header
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(this.margin, yPosition, this.pageWidth - 2 * this.margin, 8, 'F');
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Description', colX[0] + 2, yPosition + 5);
    this.doc.text('Qty', colX[1] + 2, yPosition + 5);
    this.doc.text('Rate', colX[2] + 2, yPosition + 5);
    this.doc.text('Amount', colX[3] + 2, yPosition + 5);
    yPosition += 8;

    // Table rows
    this.doc.setFont('helvetica', 'normal');
    invoiceData.items.forEach((item) => {
      this.doc.text(item.description, colX[0] + 2, yPosition + 5);
      this.doc.text(item.quantity.toString(), colX[1] + 2, yPosition + 5);
      this.doc.text(`₹${item.rate.toFixed(2)}`, colX[2] + 2, yPosition + 5);
      this.doc.text(`₹${item.amount.toFixed(2)}`, colX[3] + 2, yPosition + 5);
      yPosition += 7;
    });

    // Table border
    this.doc.setDrawColor(200, 200, 200);
    this.doc.rect(this.margin, tableStartY, this.pageWidth - 2 * this.margin, yPosition - tableStartY);
    
    // Vertical lines
    colX.slice(1).forEach(x => {
      this.doc.line(x, tableStartY, x, yPosition);
    });

    return yPosition;
  }

  private addTotals(invoiceData: InvoiceData, yPosition: number): number {
    const rightX = this.pageWidth - this.margin - 60;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    this.doc.text('Subtotal:', rightX, yPosition);
    this.doc.text(`₹${invoiceData.subtotal.toFixed(2)}`, rightX + 30, yPosition);
    yPosition += 5;

    this.doc.text(`Tax (${invoiceData.taxRate}%):`, rightX, yPosition);
    this.doc.text(`₹${invoiceData.taxAmount.toFixed(2)}`, rightX + 30, yPosition);
    yPosition += 5;

    // Total line
    this.doc.setDrawColor(0, 0, 0);
    this.doc.line(rightX, yPosition, rightX + 50, yPosition);
    yPosition += 3;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Total:', rightX, yPosition);
    this.doc.text(`₹${invoiceData.total.toFixed(2)}`, rightX + 30, yPosition);

    return yPosition;
  }

  private addNotesAndFooter(invoiceData: InvoiceData, yPosition: number): void {
    if (invoiceData.notes) {
      yPosition += 15;
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Notes:', this.margin, yPosition);
      yPosition += 5;
      
      this.doc.setFont('helvetica', 'normal');
      const notesLines = this.doc.splitTextToSize(invoiceData.notes, this.pageWidth - 2 * this.margin);
      this.doc.text(notesLines, this.margin, yPosition);
    }

    // Footer
    const footerY = this.pageHeight - 30;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Thank you for your business!', this.pageWidth / 2, footerY, { align: 'center' });
  }

  async generateFromHTML(elementId: string): Promise<jsPDF> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = this.pageWidth - 2 * this.margin;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    this.doc.addImage(imgData, 'PNG', this.margin, this.margin, imgWidth, imgHeight);
    return this.doc;
  }

  save(filename: string): void {
    this.doc.save(filename);
  }

  output(type: 'blob' | 'datauristring' | 'datauri' = 'blob'): any {
    return this.doc.output(type);
  }
}
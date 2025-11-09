import ExcelJS from 'exceljs';

export const generateSalesReport = async (orders, dateRange) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  // Set column widths and headers
  worksheet.columns = [
    { header: 'Order ID', key: 'orderNumber', width: 20 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Customer', key: 'customer', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Items', key: 'items', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Subtotal', key: 'subtotal', width: 12 },
    { header: 'Discount', key: 'discount', width: 12 },
    { header: 'Tax', key: 'tax', width: 12 },
    { header: 'Shipping', key: 'shipping', width: 12 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Payment Method', key: 'paymentMethod', width: 18 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Order Status', key: 'status', width: 15 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  orders.forEach(order => {
    const totalItems = order.items.length;
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

    worksheet.addRow({
      orderNumber: order.orderNumber,
      date: new Date(order.createdAt).toLocaleDateString(),
      customer: order.shippingAddress.fullName,
      email: order.customerEmail || '',
      items: totalItems,
      quantity: totalQuantity,
      subtotal: order.subtotal,
      discount: order.discount,
      tax: order.tax,
      shipping: order.shipping,
      total: order.total,
      paymentMethod: order.paymentMethod.toUpperCase(),
      paymentStatus: order.paymentStatus,
      status: order.status,
    });
  });

  // Format currency columns
  const currencyColumns = ['subtotal', 'discount', 'tax', 'shipping', 'total'];
  currencyColumns.forEach(col => {
    worksheet.getColumn(col).numFmt = '₹#,##0.00';
  });

  // Add summary section
  const summaryRow = worksheet.rowCount + 2;
  worksheet.getCell(`A${summaryRow}`).value = 'Summary';
  worksheet.getCell(`A${summaryRow}`).font = { bold: true, size: 14 };

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalDiscount = orders.reduce((sum, order) => sum + order.discount, 0);
  const totalTax = orders.reduce((sum, order) => sum + order.tax, 0);

  worksheet.getCell(`A${summaryRow + 1}`).value = 'Total Orders:';
  worksheet.getCell(`B${summaryRow + 1}`).value = totalOrders;

  worksheet.getCell(`A${summaryRow + 2}`).value = 'Total Revenue:';
  worksheet.getCell(`B${summaryRow + 2}`).value = totalRevenue;
  worksheet.getCell(`B${summaryRow + 2}`).numFmt = '₹#,##0.00';

  worksheet.getCell(`A${summaryRow + 3}`).value = 'Total Discount:';
  worksheet.getCell(`B${summaryRow + 3}`).value = totalDiscount;
  worksheet.getCell(`B${summaryRow + 3}`).numFmt = '₹#,##0.00';

  worksheet.getCell(`A${summaryRow + 4}`).value = 'Total Tax:';
  worksheet.getCell(`B${summaryRow + 4}`).value = totalTax;
  worksheet.getCell(`B${summaryRow + 4}`).numFmt = '₹#,##0.00';

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook;
};

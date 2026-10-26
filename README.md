# MF STREAM Invoice Studio

A professional invoice generator and management web application built for **MF Stream – Matinee Films Private Limited**.

## Features

- **Exact A4 Single-Page Invoice Template**: Matches official PDF formatting with high-precision layout, authentic branding, colors (`#F8B217`), and watermark.
- **Permanent Constants**: Company address, bank account details, default tax rate, and contact information stay permanently saved in `localStorage` across page refreshes.
- **Live In-Place Editing**: Click directly on any text or number to edit inline.
- **Dynamic Math Engine**: Real-time calculations for subtotal, discount, taxable value, GST (CGST/SGST intra-state or IGST inter-state), round off, and total due.
- **Indian Rupee Words Converter**: Converts invoice totals to words (e.g. *Rupees Thirty Five Thousand Four Hundred Only*) in real-time.
- **Invoice History Manager**:
  - Save invoice snapshots.
  - Export full history to JSON and CSV (Excel-ready).
  - Import previous history files with smart merge or replace.
  - Clone/duplicate past invoices with auto-incremented invoice numbers.
  - Auto-records invoices to history when downloading/printing.
- **Mobile Responsive**: Fully responsive layout optimized for mobile screens, tablets, and desktops with auto-fitting zoom.
- **Authentication**: Secure portal access with session persistence.

## Tech Stack

- HTML5
- Vanilla CSS3 (Custom Design System, Glassmorphism, CSS Variables, Print Media Queries)
- JavaScript (ES6+, LocalStorage Persistence, File API)

## Getting Started

Open `index.html` in any modern web browser or serve via a local static server:

```bash
# Using Python
python3 -m http.server 5500

# Or using VS Code Live Server / npx serve
npx serve .
```

# PDF Filler App

A web-based application that generates filled PDF forms from Excel data. The app allows users to map Excel columns to PDF form fields and generates individual PDFs for each row in the Excel file, organized by "Entidad Territorial" folders.

## Features

- Upload Excel files and PDF templates
- Automatic field mapping based on column names
- Support for multiple selection fields (semicolon-separated values)
- Special handling for "Other" gender fields
- Automatic date formatting for date fields
- Organized output with folders by "Entidad Territorial"
- Sequential numbering of PDFs within each folder
- Original templates included in the output zip file
- Web-based interface with modern UI
- Responsive design for various screen sizes

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pdf-filler-app.git
cd pdf-filler-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Click "Choose File" to select your Excel file (.xlsx or .xls)
2. Click "Choose File" to select your PDF template
3. The app will automatically map fields where column names match PDF field names
4. Adjust any field mappings if needed
5. Click "Generate PDFs" to process the files
6. A zip file will be downloaded containing:
   - The original Excel file
   - The original PDF template
   - Folders for each "Entidad Territorial" containing the generated PDFs

## Project Structure

```
pdf-filler-app/
├── public/
│   ├── index.html      # Main application file
│   └── electron.js     # Electron-specific code
├── server.js           # Express server for web version
├── package.json        # Project dependencies and scripts
└── README.md          # This file
```

## Dependencies

- Express.js - Web server
- PDF-Lib - PDF manipulation
- XLSX - Excel file processing
- JSZip - ZIP file creation
- Bootstrap - UI styling

## Development

To run the development server:
```bash
npm run dev
```

To build for production:
```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- PDF-Lib for PDF manipulation
- XLSX for Excel file processing
- JSZip for ZIP file creation
- Bootstrap for UI components

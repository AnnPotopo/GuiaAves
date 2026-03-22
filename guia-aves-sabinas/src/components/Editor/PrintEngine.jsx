import React from 'react';
import PageRenderer from './PageRenderer';

export default function PrintEngine({ pages, bookSize, printSettings, bookTitle }) {
    // Si no estamos imprimiendo, la clase 'print:flex' se asegura de que esté oculto en pantalla
    return (
        <div className="hidden print:flex flex-col w-full bg-white m-0 p-0 z-[9999]">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          @page {
            margin: 0 !important;
            size: auto;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

            {pages.map((p, idx) => (
                // Forzamos un salto de página después de cada contenedor, y lo centramos en el papel
                <div key={`print-${p.id}`} className="break-after-page flex flex-col items-center justify-center w-[100vw] min-h-[100vh] overflow-hidden bg-white">
                    <PageRenderer
                        pageData={p}
                        bookSize={bookSize}
                        printSettings={printSettings}
                        isPrintMode={true}
                        pageIndex={idx}
                        bookTitle={bookTitle}
                    />
                </div>
            ))}
        </div>
    );
}
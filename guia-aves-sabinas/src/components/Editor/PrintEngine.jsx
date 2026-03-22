import React from 'react';
import PageRenderer from './PageRenderer';

export default function PrintEngine({ pages, bookSize, printSettings, bookTitle }) {
  return (
    <div className="hidden print:block w-full bg-white m-0 p-0 z-[9999] absolute top-0 left-0">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 0 !important; size: auto; }
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
         <PageRenderer
            key={`print-${p.id}`}
            pageData={p}
            bookSize={bookSize}
            printSettings={printSettings}
            isPrintMode={true}
            pageIndex={idx}
            bookTitle={bookTitle}
         />
      ))}
    </div>
  );
}
// Printer utilities

// Format member card for printing
export function formatMemberCardData(member, org) {
  return {
    orgName: org?.name || 'LIMHS CAFETERIA',
    orgLogo: org?.logo_url,
    memberName: member.name,
    memberId: member.member_id,
    contact: member.contact,
    validUntil: member.valid_until,
    photoUrl: member.photo_url,
    supportPhone: org?.support_phone,
    supportWhatsapp: org?.support_whatsapp,
    lostCardFee: org?.lost_card_fee || 500,
  };
}

// Open print dialog for element
export function printElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print</title>
        <style>
          body { margin: 0; padding: 20px; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}


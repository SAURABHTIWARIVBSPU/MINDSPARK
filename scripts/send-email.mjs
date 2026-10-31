import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

async function main() {
  const zipPath = path.resolve('Program_Admit_Card_Calling_Sheets_ALL.zip');
  console.log('ZIP exists:', fs.existsSync(zipPath), 'Size:', fs.statSync(zipPath).size);

  const transporter = nodemailer.createTransport({
    host: 'gmail-smtp-in.l.google.com',
    port: 25,
    secure: false,
    name: 'mindspark.edu.in',
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: '"MindSpark 2026 Committee" <admitcards@mindspark.edu.in>',
    to: 'stw284701@gmail.com',
    subject: 'MindSpark 2026 - All 19 Program Calling Sheets & Admit Card Download Tracker',
    text: `Respected Sir/Ma'am,

Please find attached the official MindSpark 2026 Telecalling & Admit Card Tracker Archive ("Program_Admit_Card_Calling_Sheets_ALL.zip").

It contains 19 separate Excel spreadsheets (one for each competition program) plus the Master Executive Dashboard:
1. Unique & Creative Handmade Fancy Dress (Play Group)
2. Colour by Number (Nursery)
3. Join the Dots & Colour (LKG)
4. Complete the Picture & Colour (UKG)
5. Clay Champs (Class 1)
6. Dress to Impress (Class 1)
7. Paint Your Imagination (Classes 2 & 3)
8. Writing Stars (Classes 2 & 3)
9. Battle of Brains (Classes 4 & 5)
10. Poster Artist (Classes 4 & 5)
11. Junior Scientist (Classes 6 to 8)
12. Fireless Cooking (Classes 6 to 8)
13. Young Innovators (Classes 9 & 10)
14. Online Quiz (Classes 9 & 10)
15. Online Quiz (Classes 11 & 12)
16. Writing Quest (Classes 11 & 12)
17. Online Quiz (Graduation)
18. Essay Writing (Graduation)
19. Administrative Pending Review

Each Excel sheet has dedicated tabs:
- Tab 1: All Enrolled Students (with primary calling numbers, exam dates, shifts, venues)
- Tab 2: PENDING DOWNLOAD (Priority Calling Sheet for candidates who have not yet downloaded)
- Tab 3: Already Downloaded Admit Cards
- Tab 4: Program Summary & Telecalling KPIs

Total Students: 6,046
Portal Download URL: https://mindspark.edu.in/admit-card

Regards,
MindSpark 2026 Organising Committee
Meena Shah Public School & MSITM, Gonda`,
    attachments: [
      {
        filename: 'Program_Admit_Card_Calling_Sheets_ALL.zip',
        path: zipPath
      }
    ]
  };

  console.log('Sending email to stw284701@gmail.com via gmail-smtp-in.l.google.com:25...');
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('Email send failed:', err.message);
    if (err.response) console.error('SMTP Response:', err.response);
  }
}

main();

# Defect Report & Root Cause Analysis — Admit Card Layout Collision

**Defect ID:** BUG-ADMIT-001  
**Severity:** High (Visual Defect / Print Layout Quality Issue)  
**Status:** Diagnosed & Fix Strategy Identified  
**Affected Component:** [`src/lib/pdf/template.ts`](file:///c:/Users/SAURABH%20TIWARI/Desktop/Mind-Spark/src/lib/pdf/template.ts)  
**Reported Evidence:** Candidate Admit Card PDF preview screenshot (`media_1792319977998.png`)  

---

## 1. Defect Summary

In the generated A4 Admit Card PDF, the section title **`EXAMINATION SCHEDULE & VENUE DETAILS`** and the top border of the examination schedule card collide and overlap directly on top of the 6th row of the Candidate Particulars table (**`School / College / Institution : ...`**).

---

## 2. Evidence & Visual Artifacts

### User-Uploaded Defect Capture
As seen in the verification capture:
- The 6th row reads: `School / College / Institution : AIMS INTERNATIONAL`
- The header `EXAMINATION SCHEDULE & VENUE DETAILS` in bold maroon is printed across the text line of row 6.
- The top amber border of the schedule box (`DATE OF EXAMINATION 01 Nov 2026`) cuts directly through the bottom line of the particulars grid.

---

## 3. Step-by-Step Reproduction Procedure

1. Run the local application or call `generateAdmitCardPdf(student, settings)` with a standard student record.
2. Provide a student record with all standard fields (Name, Father, DOB, Phone, Class/Category, School).
3. View the generated PDF in an A4 viewer or Acrobat Reader.
4. Observe the vertical position of Section 4 (Candidate Particulars) and Section 5 (Examination Schedule & Venue Details).
5. **Observed Result**: The header text of Section 5 overlaps with the last row of Section 4.

---

## 4. Root Cause Analysis (Mathematical Evidence)

Examining [`src/lib/pdf/template.ts`](file:///c:/Users/SAURABH%20TIWARI/Desktop/Mind-Spark/src/lib/pdf/template.ts):

```typescript
// Line 208-212: Photo Box Dimensions & Initial Y
const particularsW = width - 60 - 120;
const photoW = 105;
const photoH = 125;
const photoX = width - 30 - photoW;
const photoY = curY - photoH; // <-- photoY evaluated BEFORE curY -= 10

// Line 223: Title spacing
curY -= 10; // curY is now (curY_before - 10)

// Line 276-288: Particulars Table Loop (6 rows, 22pt height each)
const rowHeight = 22;
for (let i = 0; i < fields.length; i++) {
  const rY = curY - (i + 1) * rowHeight;
  // For i = 5 (6th row):
  // rY = (curY_before - 10) - (6 * 22) = curY_before - 142 pt
  // Text is drawn at rY + 6 = curY_before - 136 pt
}

// Line 345: SECTION SPACING DEFECT
curY = photoY - 18;
// photoY was (curY_before - 125)
// Therefore, curY becomes: (curY_before - 125) - 18 = curY_before - 143 pt!

// Line 348-350: Section 5 Header
page.drawText('EXAMINATION SCHEDULE & VENUE DETAILS', {
  x: 32,
  y: curY, // <-- Drawn at curY_before - 143 pt!
  size: 10.5,
  font: fontBold,
  color: maroon,
});
```

### The Conflict:
- The bottom of the 6th table row is at `curY_before - 142 pt`.
- The text baseline of row 6 is at `curY_before - 136 pt`.
- `EXAMINATION SCHEDULE & VENUE DETAILS` is drawn at baseline `curY_before - 143 pt`.
- Because the font size is `10.5 pt`, its capital letters extend upwards from `y = -143` to `y = -132.5` pt.
- **Result**: The title and table row occupy the exact same physical vertical space (`y = -132.5` to `-142`), creating a direct collision.

---

## 5. Remediation Strategy

To guarantee that no overlap can ever occur regardless of the number of fields or photo box dimensions:

1. **Calculate Table Bottom Explicitly**:
   ```typescript
   const tableStartAfterTitleY = curY; // curY immediately before row 0
   const tableBottomY = tableStartAfterTitleY - (fields.length * rowHeight);
   ```

2. **Compute True Bounding Bottom**:
   The particulars section ends at whichever element extends lower: the candidate particulars table or the passport photo box.
   ```typescript
   const particularsSectionBottom = Math.min(tableBottomY, photoY);
   ```

3. **Apply Clean Separation Margin**:
   Set `curY` with a generous 20-22 pt buffer below `particularsSectionBottom`:
   ```typescript
   curY = particularsSectionBottom - 22;
   ```

4. **Verify Bottom Page Clearance**:
   With standard A4 page height (841.89 pt), this leaves over 150 pt of margin at the bottom of the page, ensuring all signature panels and security footers fit comfortably without spillover or pagination.

---

## 6. Verification & Regression Test Plan

1. **Unit Test (`tests/unit/pdf-generator.test.ts`)**:
   Add an automated test measuring vertical layout bounds to ensure `examinationScheduleTitleY < particularsTableBottomY - 15`.
2. **Visual Inspection**:
   Generate sample A4 PDF and verify that `media_1792319977998.png` is resolved with clear whitespace separation.
3. **Full Test Suite & Production Build**:
   Verify `npm test` (all 13 test suites) and `npm run build` pass with zero errors.

# Production Messaging Reconciliation Report

**Date:** October 24, 2026  
**Auditor:** Backend Architecture & Database Reliability Engineering Team  
**Scope:** Reconciled Counts, Unresolved Student Records, and Recommended Actions  

---

## 1. Reconciled Authoritative Counts

| Category | Authoritative Count | Percentage of Registry | Reconciliation Status |
|---|:---:|:---:|---|
| **Total Active Registry** | **1,442** | 100.00% | Verified |
| **Confirmed Successfully Sent (`SENT` / `OPENED`)** | **1,434** | 99.45% | Fully Reconciled & Locked |
| **Pending Initial Dispatch (`NOT_SENT`)** | **4** | 0.28% | Blocked by Phone Validation |
| **Confirmed Delivery Failed (`FAILED`)** | **4** | 0.28% | Blocked by Phone Validation |
| **Uncertain Delivery State (`UNCERTAIN`)** | **0** | 0.00% | Clean |
| **Total Unresolved / Actionable Records** | **8** | **0.56%** | Requires Phone Correction |

---

## 2. Detailed Audit of the 8 Unresolved Records

All remaining undelivered records (4 Pending + 4 Failed) stem from invalid or incomplete recipient phone numbers in the initial registration dataset. The system's deduplication and validation guards correctly prevented blind messaging to these numbers.

### A. Pending Queue Candidates (4 Records)

| # | Reg. No. | Candidate Name (Masked) | Phone in DB | Issue / Root Cause | Action Required |
|---|---|---|---|---|---|
| 1 | `MS261100046` | M*** T*** | `735513909` | Incomplete 9-digit number | Obtain missing 10th digit from parent |
| 2 | `MS261100604` | B*** M*** | `2862756102` | Invalid prefix (starts with '2') | Obtain valid Indian mobile (6-9 prefix) |
| 3 | `MS261100736` | S*** M*** | `(Blank)` | No phone number provided | Request phone number from school |
| 4 | `MS261101296` | P*** B*** | `0000000000` | Dummy / placeholder zeros | Request valid phone number |

### B. Failed Candidates (4 Records)

| # | Reg. No. | Candidate Name (Masked) | Phone in DB | Issue / Root Cause | Action Required |
|---|---|---|---|---|---|
| 1 | `MS261100142` | M*** K*** H*** | `8934877483` | Network / Gateway rejection on initial send | Safe to retry once verified with parent |
| 2 | `MS261100044` | A*** J*** | `(Blank)` | Blank phone number | Update phone number in database |
| 3 | `MS261100217` | M*** A*** | `829948809` | Incomplete 9-digit number | Obtain missing 10th digit |
| 4 | `MS261101054` | A*** | `723585351` | Incomplete 9-digit number | Obtain missing 10th digit |

---

## 3. Recommended Safe Actions for Administrators

1. **Do NOT Reset Sent Candidates:**  
   The 1,434 students with status `SENT` have already received their official registration confirmation on WhatsApp. Never attempt to reset their status to `NOT_SENT`.
2. **Correct Phone Numbers for the 8 Unresolved Candidates:**  
   Navigate to `/students` on the portal, locate the 8 registration numbers listed above, edit their records to enter the correct 10-digit mobile number, and save.
3. **Dispatch Only Eligible Pending Candidates:**  
   Once the phone numbers are updated, navigate to `/whatsapp`, open the **Guided Sequential Dispatch** modal, review the preview, and dispatch only the newly corrected candidates.
4. **Export Master Excel or Programme PDFs:**  
   Download the updated master Excel report or use the generated Programme Roster PDFs in `Programme_Wise_Candidate_PDFs/` for desk verification on examination day.

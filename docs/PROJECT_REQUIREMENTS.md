# Project Requirements Specification — Mind-Spark Examination & Competition Management Portal

**Version:** 1.0  
**Status:** Approved Baseline  
**Scope:** Official School/Institutional Academic Olympiad and Competition Portal  

---

## 1. Project Purpose & System Overview

The **Mind-Spark Examination & Competition Management Portal** is a production-grade web application built to manage large-scale academic competitions, olympiads, and talent searches for educational institutions in Uttar Pradesh, India.

The system serves two primary stakeholder groups:
1. **Public Candidates & Parents**: Access the public portal to verify student registration details and download official, tamper-evident Provisional Admit Cards / Entry Passes without needing an account.
2. **Authorized Institutional Staff**: Administrative staff, coordinators, and operators manage candidates, import and clean bulk multi-sheet Excel workbooks, allocate collision-safe registration numbers, monitor examination venues, dispatch official WhatsApp notifications, and audit system activities.

---

## 2. User Roles & Access Control

The application implements strict Role-Based Access Control (RBAC) enforced via session tokens:

| Role | Permissions & Capabilities |
| :--- | :--- |
| **PUBLIC (Unauthenticated)** | Search admit card using `Registration Number` + `Date of Birth`; download personal PDF admit card; view general examination guidelines. No access to administrative routes or student registries. |
| **READ_ONLY** | View dashboard metrics, student directory, audit logs, and settings. Cannot modify records or import data. |
| **REGISTRATION_OPERATOR** | View and search students, edit individual student records, manually register new candidates, trigger individual admit card downloads. |
| **ADMIN** | All operator capabilities plus bulk Excel import/export, batch admit card generation jobs, WhatsApp notification queues, and examination venue configurations. |
| **SUPER_ADMIN** | Full system control: user account provisioning, system settings reconfiguration, master data wipe/rollback, and security audit log analysis. |

---

## 3. Verified Functional Requirements

### 3.1 Student Registration & Record Management
- **Master Dataset Baseline**: 1,134 verified candidates ingested across 11 official class categories (Playgroup, LKG, UKG, Class 1 to 10, Class 11, Class 12, and Graduation).
- **Mandatory Candidate Fields**:
  - `name`: Candidate Full Name (UP institutional uppercase normalized)
  - `fatherName`: Father's / Guardian's Full Name
  - `dateOfBirth`: Format `YYYY-MM-DD` (used for verification authentication)
  - `phone`: 10-digit Indian mobile number (e.g. `7007440076`)
  - `className`: Academic standard / grade (e.g. `PLAY GROUP`, `CLASS 10`, `GRADUATION`)
  - `competitionName`: Registered competition category (e.g. `ONLINE QUIZ`, `UNIQUE AND CREATIVE HANDMADE FANCY DRESS`)
  - `schoolOrCollege`: Enrolled institution / school name
- **Registration Numbering Format**:
  - Format: `MS{YY}{5-digit-sequence}` (e.g. `MS261100037`, `MS261101141`).
  - Sequence safety: Collision-free sequential allocation starting after existing master records (`MS261101142+`).
- **Deduplication Engine**:
  - Automatically identifies duplicates on bulk import using composite signature: `[Name + FatherName + DateOfBirth + School]`.
  - Rejects/skips identical records to prevent duplicate hall tickets.

### 3.2 Examination Schedule & Venue Directives
- **Master Examination Metadata**:
  - Exam Date: e.g. `01 Nov 2026`
  - Reporting Time: `09:00 AM`
  - Gate Closure Directive: `09:30 AM STRICTLY`
  - Allocated Venue: `MSITM DEGREE COLLEGE GONDA UTTAR PRADESH` (or configured campus)
  - Helpdesk Contact: Phone number and institutional admissions email.

### 3.3 Admit Card & Hall Ticket Requirements
- **Standard Format**: Printable single-page A4 document (595.28 × 841.89 pt).
- **Design Baseline**: UP Scholarship & Government Institutional aesthetic.
  - Colors: Deep Maroon (`#7a0c16`), Warm Amber Gold (`#d97706`), Off-White (`#fcfcfd`).
  - Dual security border: 2pt outer maroon frame + 0.8pt inner gold border.
- **Required Visual & Layout Elements**:
  1. **Header Banner**: School/Organization Title, Competition Subtitle, and Gold Badge (`OFFICIAL PROVISIONAL ADMIT CARD / ENTRY PASS | 2026`).
  2. **Registration & Barcode Bar**: Prominent 17pt registration number, Class/Grade badge, dynamic vertical security barcode lines.
  3. **Candidate Particulars**: Alternating shaded rows with labels, colons, and auto-scaled text to prevent clipping of long names or school designations.
  4. **Official Passport Photo Box**: 105 × 125 pt box with inner portrait guide and self-attestation directive (`AFFIX RECENT COLOR PASSPORT PHOTOGRAPH (Self-Attested)`).
  5. **Examination Schedule & Venue Card**: Highlighted card containing Exam Date, Reporting Time, strict Gate Close notice, Allocated Venue, and Helpdesk.
  6. **Essential Directives**: 5-point standard candidate instructions.
  7. **Triple Authorization Panels**:
     - Candidate's Signature (`In presence of Invigilator`)
     - Room Invigilator's Signature (`Verified Photo & Identity`)
     - Controller of Examinations with official authorization seal.
  8. **Anti-Fraud Security Footer**: Verification string, candidate registration number, and generation timestamp.

---

## 4. Technical & Database Architecture

- **Pluggable Database Adapter (`IDatabaseAdapter`)**:
  - `local`: In-memory / file-based storage for zero-dependency offline environments and unit testing.
  - `supabase`: Cloud PostgreSQL adapter supporting scalable relational queries, transaction safety, and B-Tree indexing.
- **Fast Search Indexes**:
  - `registration_number` (Unique, B-Tree)
  - `phone` (B-Tree)
  - `status` (B-Tree)
  - `competition_name` (B-Tree)
  - `school_or_college` (B-Tree)
- **Security & Privacy**:
  - No plaintext passwords stored (Argon2 / scrypt password hashing).
  - Public portal search strictly scoped: only returns the single matched candidate dossier upon exact match of registration number and DOB.
  - Service-role secret keys restricted exclusively to server-side execution.

---

## 5. Acceptance Criteria

1. **Admit Card Rendering**:
   - Zero overlap between candidate particulars table and the examination schedule card.
   - Text never overflows bounding boxes or overlaps across adjacent elements.
   - All 6 candidate fields and the photo box render with clean margins.
   - All generated PDFs must conform to standard A4 format and start with `%PDF-`.
2. **Data Consistency**:
   - 1,134 official candidates queryable by registration number + DOB without error.
   - Registration sequence generates consecutive numbers without gaps or collisions.
3. **Build & Test Validation**:
   - 100% pass rate across all Vitest unit and integration suites.
   - Zero TypeScript or Next.js build errors during production build.

import fs from 'fs';
import path from 'path';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

import { getDb } from '../src/lib/db';
import { getStudentEventSchedule } from '../src/lib/pdf/event-schedule';

async function checkStatus() {
  console.log('=== CHECKING ADMIT CARD GENERATION STATUS ===\n');
  const db = getDb();
  
  // 1. Fetch all admit cards in DB
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  let existingCards = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client
      .from('admit_cards')
      .select('registration_number, status')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    data.forEach((c: any) => {
      if (c.status === 'READY') existingCards.add(String(c.registration_number).trim());
    });
    from += pageSize;
    if (data.length < pageSize) break;
  }
  console.log(`Existing READY admit cards in DB: ${existingCards.size}`);

  // 2. Fetch all students from DB
  const XLSX = require('xlsx');
  const wb = XLSX.readFile('Master_All_Students_Registry.xlsx');
  const students = XLSX.utils.sheet_to_json(wb.Sheets['Master Students'], { defval: '' });
  
  let activeEligible = 0;
  let onHold = 0;
  let alreadyGenerated = 0;
  let pendingGeneration = 0;

  const pendingList: any[] = [];

  students.forEach((s: any) => {
    const sched = getStudentEventSchedule(s['Event Category'], String(s['Class']), s['Registration No']);
    if (sched.isHold) {
      onHold++;
    } else {
      activeEligible++;
      if (existingCards.has(String(s['Registration No']).trim())) {
        alreadyGenerated++;
      } else {
        pendingGeneration++;
        pendingList.push({
          reg: s['Registration No'],
          name: s['Student Name'],
          cls: s['Class'],
          comp: s['Event Category']
        });
      }
    }
  });

  console.log(`Total Master Students:        ${students.length}`);
  console.log(`Active Eligible Candidates:   ${activeEligible}`);
  console.log(`On Hold Candidates:           ${onHold}`);
  console.log(`Already Generated in DB:      ${alreadyGenerated}`);
  console.log(`Pending Generation in DB:     ${pendingGeneration}`);
  console.log(`Sample Pending:`, pendingList.slice(0, 5));
}

checkStatus().catch(console.error);

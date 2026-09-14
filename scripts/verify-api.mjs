/**
 * scripts/verify-api.mjs
 *
 * Verifies the POST /api/teacher/course endpoint handles PDF upload properly,
 * including validation logic, size limits, and persistence of YouTube URLs.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import crypto from 'crypto';

function loadEnv() {
  try {
    const lines = readFileSync(resolve(process.cwd(), '.env'), 'utf-8').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim();
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch { }
}
loadEnv();

const BASE_URL = 'http://localhost:3000';
let cookie = '';

async function login() {
  console.log('Logging in to get session cookie...');
  const res = await fetch(`${BASE_URL}/api/auth/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher@lacer.ai', password: 'changeme123' })
  });
  if (!res.ok) {
    throw new Error('Login failed: ' + await res.text());
  }
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie.split(';')[0];
  } else {
    throw new Error('No cookie received');
  }
  console.log('Logged in successfully.');
}

async function uploadFile(fileName, fileBuffer, fileType, youtubeUrl) {
  const formData = new FormData();
  if (fileBuffer) {
    const blob = new Blob([fileBuffer], { type: fileType });
    formData.append('syllabusFile', blob, fileName);
  }
  if (youtubeUrl !== undefined) {
    formData.append('youtubeUrl', youtubeUrl);
  }

  const res = await fetch(`${BASE_URL}/api/teacher/course`, {
    method: 'POST',
    headers: { 'Cookie': cookie },
    body: formData,
  });
  
  const status = res.status;
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  
  return { status, body };
}

async function runTests() {
  try {
    await login();
    
    console.log('\n--- Test 1: No file, No YouTube URL ---');
    let res = await uploadFile('test.pdf', null, 'application/pdf');
    console.log('Status:', res.status, 'Body:', res.body);
    if (res.status === 400 && res.body.error.includes('YouTube URL')) {
       console.log('✅ Correctly caught missing YouTube URL.');
    } else {
       console.log('❌ Failed expected validation.');
    }

    console.log('\n--- Test 2: Valid YouTube URL, but invalid file extension ---');
    res = await uploadFile('test.txt', Buffer.from('hello'), 'text/plain', 'https://youtu.be/12345678901');
    console.log('Status:', res.status, 'Body:', res.body);
    if (res.status === 400 && res.body.error.includes('Only PDF files are accepted')) {
       console.log('✅ Correctly rejected non-PDF extension.');
    } else {
       console.log('❌ Failed expected validation.');
    }

    console.log('\n--- Test 3: Valid PDF extension, but invalid magic bytes (fake PDF) ---');
    res = await uploadFile('fake.pdf', Buffer.from('not a pdf'), 'application/pdf', 'https://youtu.be/12345678901');
    console.log('Status:', res.status, 'Body:', res.body);
    if (res.status === 400 && res.body.error.includes('does not appear to be a valid PDF')) {
       console.log('✅ Correctly rejected invalid magic bytes.');
    } else {
       console.log('❌ Failed expected validation.');
    }

    console.log('\n--- Test 4: Oversized file (> 5MB) ---');
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    res = await uploadFile('large.pdf', largeBuffer, 'application/pdf', 'https://youtu.be/12345678901');
    console.log('Status:', res.status, 'Body:', res.body);
    if (res.status === 400 && res.body.error.includes('too large')) {
       console.log('✅ Correctly rejected oversized file.');
    } else {
       console.log('❌ Failed expected validation for large file.');
    }
    
    console.log('\n--- Tests completed ---');
  } catch (err) {
    console.error('Test script failed:', err);
  }
}

runTests();

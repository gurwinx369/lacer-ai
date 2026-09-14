import http from 'http';

async function testApi() {
  console.log('Testing Unauthenticated GET /api/student/course');
  let res = await fetch('http://localhost:3000/api/student/course');
  console.log('Unauth /course status:', res.status);

  console.log('Testing Unauthenticated GET /api/student/course/1');
  res = await fetch('http://localhost:3000/api/student/course/1');
  console.log('Unauth /course/1 status:', res.status);
}

testApi();

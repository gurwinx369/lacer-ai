import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const { connectDB } = await import('../lib/db.js');
const mongoose = (await import('mongoose')).default;

function isExactSingleFieldIndex(index, field) {
  const keys = Object.keys(index.key);

  return (
    keys.length === 1 &&
    keys[0] === field &&
    index.key[field] === 1
  );
}

function isCorrectEmailIndex(index) {
  return (
    isExactSingleFieldIndex(index, 'email') &&
    index.unique === true &&
    index.sparse === true &&
    index.collation?.locale === 'en' &&
    index.collation?.strength === 2
  );
}

function isCorrectRegistrationIdIndex(index) {
  return (
    isExactSingleFieldIndex(index, 'registrationId') &&
    index.unique === true &&
    index.sparse === true
  );
}

function isObsoleteEmailIndex(index) {
  return (
    isExactSingleFieldIndex(index, 'email') &&
    index.unique === true &&
    index.sparse !== true
  );
}

function isAnyUniqueEmailIndex(index) {
  return (
    isExactSingleFieldIndex(index, 'email') &&
    index.unique === true
  );
}

function isAnyUniqueRegistrationIdIndex(index) {
  return (
    isExactSingleFieldIndex(index, 'registrationId') &&
    index.unique === true
  );
}

async function migrateIndexes() {
  console.log('Connecting to database...');
  await connectDB();

  const db = mongoose.connection.db;
  const collection = db.collection('users');

  console.log('\n--- Current User Indexes ---');

  let indexes = await collection.indexes();

  console.log(JSON.stringify(indexes, null, 2));

  // ---------------------------------------------------------------------------
  // EMAIL INDEX
  // ---------------------------------------------------------------------------

  const uniqueEmailIndexes = indexes.filter(isAnyUniqueEmailIndex);

  const correctEmailIndexes = uniqueEmailIndexes.filter(isCorrectEmailIndex);

  const obsoleteEmailIndexes = uniqueEmailIndexes.filter(
    isObsoleteEmailIndex
  );

  if (correctEmailIndexes.length > 1) {
    console.error(
      '\nMigration aborted: multiple correct sparse unique email indexes exist.'
    );
    console.error(JSON.stringify(correctEmailIndexes, null, 2));
    process.exit(1);
  }

  if (obsoleteEmailIndexes.length > 1) {
    console.error(
      '\nMigration aborted: multiple obsolete unique email indexes exist for email.'
    );
    console.error(JSON.stringify(obsoleteEmailIndexes, null, 2));
    process.exit(1);
  }

  const incorrectSparseEmailIndexes = uniqueEmailIndexes.filter(
    index =>
      index.sparse === true &&
      !isCorrectEmailIndex(index)
  );

  if (incorrectSparseEmailIndexes.length > 0) {
    console.error(
      '\nMigration aborted: an incorrect sparse unique email index already exists.'
    );
    console.error(
      'Manual review is required. The migration will not drop or replace it.'
    );
    console.error(
      JSON.stringify(incorrectSparseEmailIndexes, null, 2)
    );
    process.exit(1);
  }

  if (obsoleteEmailIndexes.length === 1) {
    const obsoleteEmailIndex = obsoleteEmailIndexes[0];

    console.log(
      `\nCandidate obsolete email index found: "${obsoleteEmailIndex.name}"`
    );
    console.log(
      'Definition:',
      JSON.stringify(obsoleteEmailIndex, null, 2)
    );

    // Final safety check immediately before dropping.
    if (!isObsoleteEmailIndex(obsoleteEmailIndex)) {
      console.error(
        'Safety check failed: email index no longer matches the obsolete pattern. Aborting.'
      );
      process.exit(1);
    }

    console.log(
      `Dropping obsolete email index: ${obsoleteEmailIndex.name}...`
    );

    await collection.dropIndex(obsoleteEmailIndex.name);

    console.log('Successfully dropped obsolete email index.');
  } else {
    console.log('\nNo obsolete non-sparse email index found.');
  }

  // Refresh after possible email-index deletion.
  indexes = await collection.indexes();

  const emailIndexNowExists = indexes.some(isCorrectEmailIndex);

  if (emailIndexNowExists) {
    console.log(
      'Correct sparse unique email index already exists.'
    );
  } else {
    console.log(
      '\nCreating sparse unique email index...'
    );

    await collection.createIndex(
      { email: 1 },
      {
        unique: true,
        sparse: true,
        collation: {
          locale: 'en',
          strength: 2,
        },
        name: 'email_1_sparse',
      }
    );

    console.log(
      'Created sparse unique email index.'
    );
  }

  // ---------------------------------------------------------------------------
  // REGISTRATION ID INDEX
  // ---------------------------------------------------------------------------

  indexes = await collection.indexes();

  const uniqueRegistrationIdIndexes = indexes.filter(
    isAnyUniqueRegistrationIdIndex
  );

  const correctRegistrationIdIndexes =
    uniqueRegistrationIdIndexes.filter(
      isCorrectRegistrationIdIndex
    );

  const incorrectRegistrationIdIndexes =
    uniqueRegistrationIdIndexes.filter(
      index => !isCorrectRegistrationIdIndex(index)
    );

  if (correctRegistrationIdIndexes.length > 1) {
    console.error(
      '\nMigration aborted: multiple correct sparse unique registrationId indexes exist.'
    );
    console.error(
      JSON.stringify(correctRegistrationIdIndexes, null, 2)
    );
    process.exit(1);
  }

  if (incorrectRegistrationIdIndexes.length > 0) {
    console.error(
      '\nMigration aborted: an incorrect unique registrationId index already exists.'
    );
    console.error(
      'Manual review is required. The migration will not drop or replace it.'
    );
    console.error(
      JSON.stringify(incorrectRegistrationIdIndexes, null, 2)
    );
    process.exit(1);
  }

  if (correctRegistrationIdIndexes.length === 1) {
    console.log(
      '\nThe correct sparse unique registrationId index already exists.'
    );
  } else {
    console.log(
      '\nCreating sparse unique registrationId index...'
    );

    await collection.createIndex(
      { registrationId: 1 },
      {
        unique: true,
        sparse: true,
        name: 'registrationId_1_sparse',
      }
    );

    console.log(
      'Created sparse unique registrationId index.'
    );
  }

  // ---------------------------------------------------------------------------
  // FINAL VERIFICATION
  // ---------------------------------------------------------------------------

  console.log('\n--- Resulting User Indexes ---');

  indexes = await collection.indexes();

  console.log(JSON.stringify(indexes, null, 2));

  let verificationFailed = false;

  const finalEmailIndexes = indexes.filter(
    isCorrectEmailIndex
  );

  if (finalEmailIndexes.length !== 1) {
    console.error(
      '\nVerification failed: expected exactly one correct sparse unique email index.'
    );
    verificationFailed = true;
  }

  const finalRegistrationIdIndexes = indexes.filter(
    isCorrectRegistrationIdIndex
  );

  if (finalRegistrationIdIndexes.length !== 1) {
    console.error(
      '\nVerification failed: expected exactly one correct sparse unique registrationId index.'
    );
    verificationFailed = true;
  }

  if (verificationFailed) {
    console.error(
      '\nMigration finished with verification errors.'
    );
    process.exit(1);
  }

  console.log(
    '\nMigration completed and verified successfully.'
  );

  process.exit(0);
}

migrateIndexes().catch(err => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
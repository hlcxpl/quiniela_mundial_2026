import { Pool } from 'pg';
import { INITIAL_MATCHES } from '../data/initialData';

// Create a singleton pool instance
let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is missing.');
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for Railway connection outside the VPC
      }
    });
  }
  return pool;
}

let isInitialized = false;

export async function ensureInit() {
  if (!isInitialized) {
    try {
      await initDb();
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
}

export async function query(text: string, params?: any[]) {
  const dbPool = getDbPool();
  return dbPool.query(text, params);
}

export async function initDb() {
  console.log('Initializing database schema...');
  
  // 1. Create participants table (with password_hash)
  await query(`
    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255)
    )
  `);

  // Migration: Add password_hash column if it doesn't exist yet
  await query(`
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name='participants' AND column_name='password_hash'
        ) THEN
            ALTER TABLE participants ADD COLUMN password_hash VARCHAR(255);
        END IF;
    END $$;
  `);

  // 2. Create matches table
  await query(`
    CREATE TABLE IF NOT EXISTS matches (
      id INT PRIMARY KEY,
      group_name VARCHAR(10) NOT NULL,
      home_team VARCHAR(255) NOT NULL,
      away_team VARCHAR(255) NOT NULL,
      match_date VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      home_score INT,
      away_score INT
    )
  `);

  // 3. Create predictions table
  await query(`
    CREATE TABLE IF NOT EXISTS predictions (
      participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      predicted_home_score INT NOT NULL,
      predicted_away_score INT NOT NULL,
      PRIMARY KEY (participant_id, match_id)
    )
  `);

  // 4. Create knockout predictions table
  await query(`
    CREATE TABLE IF NOT EXISTS knockout_predictions (
      participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      match_id VARCHAR(50) NOT NULL,
      winner_team VARCHAR(255),
      PRIMARY KEY (participant_id, match_id)
    )
  `);

  // 5. Create knockout results table for official results
  await query(`
    CREATE TABLE IF NOT EXISTS knockout_results (
      match_id VARCHAR(50) PRIMARY KEY,
      winner_team VARCHAR(255),
      home_score INT,
      away_score INT
    )
  `);

  // Migration: Add home_score, away_score and drop NOT NULL from winner_team
  await query(`
    DO $$
    BEGIN
        ALTER TABLE knockout_predictions ALTER COLUMN winner_team DROP NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END $$;
  `);

  await query(`
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name='knockout_predictions' AND column_name='home_score'
        ) THEN
            ALTER TABLE knockout_predictions ADD COLUMN home_score INT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name='knockout_predictions' AND column_name='away_score'
        ) THEN
            ALTER TABLE knockout_predictions ADD COLUMN away_score INT;
        END IF;
    END $$;
  `);

  // Seed matches if table is empty
  const matchesCount = await query('SELECT COUNT(*) FROM matches');
  if (parseInt(matchesCount.rows[0].count, 10) === 0) {
    console.log('Seeding matches table...');
    for (const match of INITIAL_MATCHES) {
      await query(
        `INSERT INTO matches (id, group_name, home_team, away_team, match_date, status, home_score, away_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          match.id,
          match.groupName,
          match.homeTeam,
          match.awayTeam,
          match.matchDate,
          match.status,
          match.homeScore,
          match.awayScore
        ]
      );
    }
    console.log('Seeding matches completed.');
  }

  // Seed default participant if table is empty
  const participantsCount = await query('SELECT COUNT(*) FROM participants');
  if (parseInt(participantsCount.rows[0].count, 10) === 0) {
    console.log('Seeding default participant...');
    await query(`INSERT INTO participants (name) VALUES ('Mi Predicción')`);
  }
}

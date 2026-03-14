#!/usr/bin/env node

/**
 * Meilisearch Link Importer
 * 
 * Usage:
 *   node import-to-meilisearch.js
 * 
 * Requirements:
 *   npm install meilisearch
 */

const { MeiliSearch } = require('meilisearch');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    host: process.env.MEILI_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILI_MASTER_KEY || '',
    indexName: 'links',
    linksFile: './links.json'
};

// Initialize Meilisearch client
const client = new MeiliSearch({
    host: CONFIG.host,
    apiKey: CONFIG.apiKey
});

/**
 * Import links from JSON file to Meilisearch
 */
async function importLinks() {
    console.log('🚀 Starting Meilisearch import...\n');

    try {
        // Check Meilisearch health
        console.log('📡 Checking Meilisearch connection...');
        const health = await client.health();
        console.log('✅ Connected to Meilisearch');
        console.log(`   Status: ${health.status}\n`);

        // Read links file
        console.log('📂 Reading links file...');
        const linksPath = path.resolve(CONFIG.linksFile);
        
        if (!fs.existsSync(linksPath)) {
            throw new Error(`Links file not found: ${linksPath}`);
        }

        const linksData = fs.readFileSync(linksPath, 'utf8');
        const links = JSON.parse(linksData);
        console.log(`✅ Loaded ${links.length} links from file\n`);

        // Get or create index
        console.log('🔍 Setting up index...');
        const index = client.index(CONFIG.indexName);

        // Add documents
        console.log('📤 Uploading links to Meilisearch...');
        const addTask = await index.addDocuments(links, { primaryKey: 'id' });
        console.log(`   Task UID: ${addTask.taskUid}`);

        // Wait for indexing to complete
        console.log('⏳ Waiting for indexing to complete...');
        await client.waitForTask(addTask.taskUid);
        console.log('✅ Documents indexed successfully\n');

        // Configure searchable attributes
        console.log('⚙️  Configuring search settings...');
        
        await index.updateSearchableAttributes([
            'name',
            'description',
            'tags',
            'category'
        ]);
        console.log('   ✓ Searchable attributes set');

        // Configure ranking rules for better search results
        await index.updateRankingRules([
            'words',      // Number of matching words
            'typo',       // Typo tolerance
            'proximity',  // Word proximity
            'attribute',  // Attribute ranking order
            'sort',       // Sort order
            'exactness'   // Exact matches first
        ]);
        console.log('   ✓ Ranking rules configured');

        // Configure typo tolerance
        await index.updateTypoTolerance({
            enabled: true,
            minWordSizeForTypos: {
                oneTypo: 4,
                twoTypos: 8
            }
        });
        console.log('   ✓ Typo tolerance enabled\n');

        // Get final stats
        const stats = await index.getStats();
        console.log('📊 Index Statistics:');
        console.log(`   Total documents: ${stats.numberOfDocuments}`);
        console.log(`   Index size: ${(stats.indexSize / 1024).toFixed(2)} KB`);
        console.log(`   Indexing status: ${stats.isIndexing ? 'In Progress' : 'Complete'}\n`);

        // Test search
        console.log('🔍 Testing search functionality...');
        const testSearches = ['anime', 'books', 'ai tools'];
        
        for (const query of testSearches) {
            const result = await index.search(query, { limit: 3 });
            console.log(`   "${query}" → ${result.hits.length} results (${result.processingTimeMs}ms)`);
        }

        console.log('\n✨ Import completed successfully!');
        console.log(`\n🌐 Your search index is ready at: ${CONFIG.host}`);
        console.log(`   Update your index.html with this host URL\n`);

    } catch (error) {
        console.error('\n❌ Import failed:');
        console.error(`   ${error.message}\n`);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('💡 Tip: Make sure Meilisearch is running:');
            console.log('   docker run -p 7700:7700 getmeili/meilisearch:latest');
            console.log('   or');
            console.log('   meilisearch\n');
        }
        
        process.exit(1);
    }
}

/**
 * Delete all documents from index (careful!)
 */
async function clearIndex() {
    console.log('⚠️  Clearing index...');
    
    try {
        const index = client.index(CONFIG.indexName);
        const task = await index.deleteAllDocuments();
        await client.waitForTask(task.taskUid);
        console.log('✅ Index cleared\n');
    } catch (error) {
        console.error(`❌ Failed to clear index: ${error.message}\n`);
    }
}

/**
 * Show current index stats
 */
async function showStats() {
    try {
        const index = client.index(CONFIG.indexName);
        const stats = await index.getStats();
        
        console.log('\n📊 Current Index Statistics:');
        console.log(`   Documents: ${stats.numberOfDocuments}`);
        console.log(`   Size: ${(stats.indexSize / 1024).toFixed(2)} KB`);
        console.log(`   Indexing: ${stats.isIndexing ? 'In Progress' : 'Complete'}\n`);
    } catch (error) {
        console.error(`❌ Failed to get stats: ${error.message}\n`);
    }
}

// CLI handling
const command = process.argv[2];

switch (command) {
    case 'clear':
        clearIndex();
        break;
    case 'stats':
        showStats();
        break;
    case 'help':
        console.log(`
Meilisearch Link Importer

Usage:
  node import-to-meilisearch.js [command]

Commands:
  (none)    Import links from links.json
  clear     Delete all documents from index
  stats     Show index statistics
  help      Show this help message

Environment Variables:
  MEILI_HOST         Meilisearch host (default: http://localhost:7700)
  MEILI_MASTER_KEY   Master key for authentication (default: none)

Examples:
  node import-to-meilisearch.js
  MEILI_HOST=https://my-meili.com node import-to-meilisearch.js
  node import-to-meilisearch.js stats
        `);
        break;
    default:
        importLinks();
}

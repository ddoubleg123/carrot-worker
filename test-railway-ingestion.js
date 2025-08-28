const fetch = require('node-fetch');

// Railway service URL - update this with your actual Railway URL
const RAILWAY_URL = process.env.RAILWAY_INGESTION_URL || 'https://your-railway-service.railway.app';

async function testRailwayService() {
    console.log('🚀 Testing Railway Video Ingestion Service...\n');
    
    try {
        // Test 1: Health check
        console.log('1. Testing health endpoint...');
        const healthResponse = await fetch(`${RAILWAY_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);
        
        // Test 2: Create ingestion job with YouTube URL
        console.log('\n2. Creating ingestion job with YouTube URL...');
        const testYouTubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        
        const ingestResponse = await fetch(`${RAILWAY_URL}/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: testYouTubeUrl
            })
        });
        
        if (!ingestResponse.ok) {
            throw new Error(`Ingest request failed: ${ingestResponse.status} ${ingestResponse.statusText}`);
        }
        
        const ingestData = await ingestResponse.json();
        console.log('✅ Ingestion job created:', ingestData);
        
        const jobId = ingestData.job_id;
        
        // Test 3: Poll job status until completion
        console.log('\n3. Polling job status...');
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            attempts++;
            
            const statusResponse = await fetch(`${RAILWAY_URL}/jobs/${jobId}`);
            if (!statusResponse.ok) {
                throw new Error(`Status request failed: ${statusResponse.status} ${statusResponse.statusText}`);
            }
            
            const statusData = await statusResponse.json();
            console.log(`📊 Job ${jobId} - Status: ${statusData.status}, Progress: ${statusData.progress}%`);
            
            if (statusData.status === 'completed') {
                console.log('✅ Job completed successfully!');
                console.log('📋 Result:', JSON.stringify(statusData.result, null, 2));
                
                // Verify mock data structure
                const result = statusData.result;
                if (result.video_id && result.title && result.formats && result.formats.length > 0) {
                    console.log('✅ Mock YouTube data structure is valid');
                    console.log(`   - Video ID: ${result.video_id}`);
                    console.log(`   - Title: ${result.title}`);
                    console.log(`   - Audio formats: ${result.formats.length}`);
                    console.log(`   - Duration: ${result.duration}s`);
                } else {
                    console.log('❌ Invalid result structure');
                }
                break;
            } else if (statusData.status === 'failed') {
                console.log('❌ Job failed:', statusData.error);
                break;
            }
        }
        
        if (attempts >= maxAttempts) {
            console.log('⏰ Job polling timed out');
        }
        
        // Test 4: Test download-audio endpoint
        console.log('\n4. Testing download-audio endpoint...');
        const downloadResponse = await fetch(`${RAILWAY_URL}/download-audio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: 'https://mock-audio-url.googlevideo.com/dQw4w9WgXcQ/audio.m4a'
            })
        });
        
        if (downloadResponse.ok) {
            const contentType = downloadResponse.headers.get('content-type');
            const contentLength = downloadResponse.headers.get('content-length');
            console.log(`✅ Download-audio endpoint working - Content-Type: ${contentType}, Length: ${contentLength} bytes`);
        } else {
            console.log(`⚠️ Download-audio endpoint returned: ${downloadResponse.status} ${downloadResponse.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testRailwayService().then(() => {
    console.log('\n🎉 All tests completed!');
}).catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
});

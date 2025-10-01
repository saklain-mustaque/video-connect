#!/bin/bash

# Quick Environment Test Script
# Run this on Azure VM to verify .env is working

echo "======================================"
echo "Environment Variables Test"
echo "======================================"
echo ""

cd ~/video-connect || {
    echo "❌ Error: ~/video-connect directory not found"
    exit 1
}

echo "✓ In video-connect directory"
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✓ .env file exists"
    echo "  Location: $(pwd)/.env"
    echo "  Size: $(wc -c < .env) bytes"
    echo "  Lines: $(wc -l < .env) lines"
else
    echo "❌ .env file NOT found"
    exit 1
fi
echo ""

# Check file permissions
echo "File permissions:"
ls -l .env
echo ""

# Test dotenv loading with Node
echo "Testing dotenv with Node.js..."
node << 'EOF'
import('dotenv').then(async (dotenv) => {
    const result = dotenv.default.config();
    
    if (result.error) {
        console.log('❌ Error loading .env:', result.error.message);
    } else {
        const parsed = result.parsed || {};
        console.log(`✅ Successfully loaded ${Object.keys(parsed).length} variables`);
        console.log('');
        console.log('Variables found:');
        Object.keys(parsed).forEach(key => {
            const value = parsed[key];
            const displayValue = value.length > 30 
                ? value.substring(0, 30) + '...' 
                : value;
            console.log(`  ${key}: ${displayValue}`);
        });
    }
    
    console.log('');
    console.log('Checking critical variables in process.env:');
    const checks = [
        'MONGODB_URI',
        'SESSION_SECRET',
        'LIVEKIT_URL',
        'LIVEKIT_API_KEY',
        'LIVEKIT_API_SECRET',
        'NODE_ENV',
        'COOKIE_DOMAIN'
    ];
    
    checks.forEach(key => {
        const value = process.env[key];
        if (value) {
            console.log(`  ✓ ${key} is set`);
        } else {
            console.log(`  ❌ ${key} is MISSING`);
        }
    });
}).catch(err => {
    console.log('❌ Error running test:', err.message);
});
EOF

echo ""
echo "======================================"
echo "Test Complete"
echo "======================================"

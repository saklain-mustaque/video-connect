import "dotenv/config";

// Diagnostic script to verify Azure configuration
console.log("=".repeat(60));
console.log("Azure Deployment Configuration Check");
console.log("=".repeat(60));

interface ConfigCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  status: 'OK' | 'MISSING' | 'WARNING';
  message?: string;
}

const checks: ConfigCheck[] = [
  {
    name: 'NODE_ENV',
    value: process.env.NODE_ENV,
    required: true,
    status: process.env.NODE_ENV === 'production' ? 'OK' : 'WARNING',
    message: process.env.NODE_ENV !== 'production' ? 'Should be "production" for Azure' : undefined
  },
  {
    name: 'MONGODB_URI',
    value: process.env.MONGODB_URI ? '✓ Set' : undefined,
    required: true,
    status: process.env.MONGODB_URI ? 'OK' : 'MISSING'
  },
  {
    name: 'SESSION_SECRET',
    value: process.env.SESSION_SECRET ? '✓ Set' : undefined,
    required: true,
    status: process.env.SESSION_SECRET ? 'OK' : 'MISSING',
    message: process.env.SESSION_SECRET === 'video-conference-super-secret-key-change-in-production' 
      ? 'Using default - consider changing for production' 
      : undefined
  },
  {
    name: 'COOKIE_DOMAIN',
    value: process.env.COOKIE_DOMAIN,
    required: false,
    status: process.env.COOKIE_DOMAIN ? 'OK' : 'WARNING',
    message: !process.env.COOKIE_DOMAIN ? 'Not set - may cause cookie issues on Azure' : undefined
  },
  {
    name: 'LIVEKIT_URL',
    value: process.env.LIVEKIT_URL ? '✓ Set' : undefined,
    required: true,
    status: process.env.LIVEKIT_URL ? 'OK' : 'MISSING'
  },
  {
    name: 'LIVEKIT_API_KEY',
    value: process.env.LIVEKIT_API_KEY ? '✓ Set' : undefined,
    required: true,
    status: process.env.LIVEKIT_API_KEY ? 'OK' : 'MISSING'
  },
  {
    name: 'LIVEKIT_API_SECRET',
    value: process.env.LIVEKIT_API_SECRET ? '✓ Set' : undefined,
    required: true,
    status: process.env.LIVEKIT_API_SECRET ? 'OK' : 'MISSING'
  }
];

console.log("\nEnvironment Variables:");
console.log("-".repeat(60));

let hasErrors = false;
let hasWarnings = false;

checks.forEach(check => {
  const statusSymbol = check.status === 'OK' ? '✓' : check.status === 'WARNING' ? '⚠' : '✗';
  const statusColor = check.status === 'OK' ? '\x1b[32m' : check.status === 'WARNING' ? '\x1b[33m' : '\x1b[31m';
  const resetColor = '\x1b[0m';
  
  console.log(`${statusColor}${statusSymbol}${resetColor} ${check.name}: ${check.value || 'NOT SET'}`);
  
  if (check.message) {
    console.log(`  └─ ${check.message}`);
  }
  
  if (check.required && check.status === 'MISSING') {
    hasErrors = true;
  }
  
  if (check.status === 'WARNING') {
    hasWarnings = true;
  }
});

console.log("\n" + "=".repeat(60));
console.log("Configuration Recommendations:");
console.log("-".repeat(60));

const recommendations = [
  {
    condition: process.env.NODE_ENV !== 'production',
    message: '• Set NODE_ENV=production in Azure App Service Configuration'
  },
  {
    condition: !process.env.COOKIE_DOMAIN,
    message: '• Add COOKIE_DOMAIN=.farooqfarrukh.rest in Azure App Service Configuration'
  },
  {
    condition: hasErrors,
    message: '• Fix missing required environment variables before deploying'
  }
];

recommendations.forEach(rec => {
  if (rec.condition) {
    console.log(rec.message);
  }
});

console.log("\n" + "=".repeat(60));
console.log("Azure App Service Checklist:");
console.log("-".repeat(60));
console.log("[ ] All environment variables set in Azure Portal");
console.log("[ ] HTTPS Only enabled in Azure App Service");
console.log("[ ] Custom domain configured (if applicable)");
console.log("[ ] SSL certificate valid");
console.log("[ ] App Service restarted after configuration changes");
console.log("[ ] Browser cookies cleared before testing");

console.log("\n" + "=".repeat(60));
console.log("Database Connection Test:");
console.log("-".repeat(60));

if (process.env.MONGODB_URI) {
  console.log("Testing MongoDB connection...");
  
  import('mongoose').then(async (mongoose) => {
    try {
      await mongoose.default.connect(process.env.MONGODB_URI!);
      console.log("\x1b[32m✓\x1b[0m MongoDB connection successful");
      
      const collections = await mongoose.default.connection.db?.listCollections().toArray();
      console.log(`  Collections found: ${collections?.length || 0}`);
      collections?.forEach(col => {
        console.log(`    - ${col.name}`);
      });
      
      await mongoose.default.disconnect();
    } catch (error) {
      console.log("\x1b[31m✗\x1b[0m MongoDB connection failed");
      console.log(`  Error: ${error}`);
    }
    
    console.log("\n" + "=".repeat(60));
    
    if (hasErrors) {
      console.log("\x1b[31mStatus: CONFIGURATION ERRORS FOUND\x1b[0m");
      console.log("Please fix the errors above before deploying to Azure.");
      process.exit(1);
    } else if (hasWarnings) {
      console.log("\x1b[33mStatus: CONFIGURATION WARNINGS\x1b[0m");
      console.log("Configuration is functional but can be improved.");
    } else {
      console.log("\x1b[32mStatus: CONFIGURATION OK\x1b[0m");
      console.log("All checks passed! Ready for Azure deployment.");
    }
    
    process.exit(0);
  }).catch(error => {
    console.log("\x1b[31m✗\x1b[0m Failed to load mongoose");
    console.log(`  Error: ${error}`);
    process.exit(1);
  });
} else {
  console.log("\x1b[31m✗\x1b[0m MONGODB_URI not set, skipping connection test");
  
  if (hasErrors) {
    console.log("\n\x1b[31mStatus: CONFIGURATION ERRORS FOUND\x1b[0m");
    console.log("Please fix the errors above before deploying to Azure.");
    process.exit(1);
  } else if (hasWarnings) {
    console.log("\n\x1b[33mStatus: CONFIGURATION WARNINGS\x1b[0m");
    console.log("Configuration is functional but can be improved.");
  } else {
    console.log("\n\x1b[32mStatus: CONFIGURATION OK\x1b[0m");
    console.log("All checks passed! Ready for Azure deployment.");
  }
  
  process.exit(0);
}

/**
 * Updates the contract address in the frontend code after a new deployment
 * Run with: node scripts/update-contract-address.js <NEW_CONTRACT_ADDRESS>
 */
const fs = require('fs');
const path = require('path');

// Get the new contract address from command-line arguments
const newAddress = process.argv[2];

if (!newAddress || !newAddress.startsWith('0x')) {
  console.error('Please provide a valid contract address starting with 0x');
  process.exit(1);
}

// Path to the blockchain.js file
const blockchainFilePath = path.join(
  __dirname, 
  '..', 
  'frontend', 
  'src', 
  'utils', 
  'blockchain.js'
);

try {
  // Read the file content
  let content = fs.readFileSync(blockchainFilePath, 'utf8');
  
  // Replace the CONTRACT_ADDRESS value
  const updated = content.replace(
    /const CONTRACT_ADDRESS = "0x[a-fA-F0-9]+";/,
    `const CONTRACT_ADDRESS = "${newAddress}";`
  );
  
  // Write the updated content back
  fs.writeFileSync(blockchainFilePath, updated);
  
  console.log(`✅ Successfully updated contract address to ${newAddress} in blockchain.js`);
} catch (error) {
  console.error(`❌ Error updating contract address: ${error.message}`);
  process.exit(1);
}

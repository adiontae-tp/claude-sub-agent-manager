#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { program } = require('commander');

/**
 * Searches for config files by walking up the directory tree
 * @param {string} startDir - Directory to start searching from
 * @param {string[]} configNames - Array of possible config file names
 * @returns {string|null} - Path to found config file or null
 */
function findConfigFile(startDir, configNames) {
  let currentDir = startDir;
  
  while (currentDir !== path.parse(currentDir).root) {
    for (const configName of configNames) {
      const configPath = path.join(currentDir, configName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    
    // Check if we've reached a project root (presence of .git or package.json)
    const gitPath = path.join(currentDir, '.git');
    const pkgPath = path.join(currentDir, 'package.json');
    
    if (fs.existsSync(gitPath) || fs.existsSync(pkgPath)) {
      // This is likely the project root, stop searching if we haven't found config
      break;
    }
    
    // Move up one directory
    currentDir = path.dirname(currentDir);
  }
  
  // Check root directory as last resort
  for (const configName of configNames) {
    const configPath = path.join(currentDir, configName);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  
  return null;
}

/**
 * Load and parse config file
 * @param {string} configPath - Path to config file
 * @returns {object} - Parsed config object
 */
function loadConfig(configPath) {
  try {
    const ext = path.extname(configPath).toLowerCase();
    const content = fs.readFileSync(configPath, 'utf8');
    
    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      // For YAML support, we'll need to add js-yaml as a dependency
      try {
        const yaml = require('js-yaml');
        return yaml.load(content);
      } catch (e) {
        console.error('YAML support requires js-yaml package. Please install it with: npm install js-yaml');
        process.exit(1);
      }
    } else {
      console.error(`Unsupported config file format: ${ext}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error loading config file: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Get the project root directory
 * @param {string} startDir - Directory to start searching from
 * @returns {string} - Project root directory
 */
function findProjectRoot(startDir) {
  let currentDir = startDir;
  
  while (currentDir !== path.parse(currentDir).root) {
    // Check for common project root indicators
    const indicators = ['.git', 'package.json', '.claude-agents.json', '.claude-agents.yaml', '.claude-agents.yml'];
    
    for (const indicator of indicators) {
      if (fs.existsSync(path.join(currentDir, indicator))) {
        return currentDir;
      }
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  return startDir; // Fall back to start directory if no root found
}

// Parse command line arguments
program
  .name('claude-agents')
  .description('Claude Sub-Agent Manager CLI')
  .version(require('./package.json').version)
  .option('-c, --config <path>', 'path to config file')
  .option('-r, --root <path>', 'project root directory')
  .option('-p, --port <number>', 'port to run the server on', '3001')
  .option('--no-browser', 'do not open browser automatically')
  .action((options) => {
    const startDir = process.cwd();
    let configPath = options.config;
    let projectRoot = options.root;
    
    // Find config file if not specified
    if (!configPath) {
      const configNames = ['.claude-agents.json', '.claude-agents.yaml', '.claude-agents.yml'];
      configPath = findConfigFile(startDir, configNames);
      
      if (!configPath) {
        console.log('No config file found. Creating default .claude-agents.json in current directory...');
        configPath = path.join(startDir, '.claude-agents.json');
        const defaultConfig = {
          projectName: path.basename(startDir),
          agentsDirectory: ".claude/agents",
          techStackFile: "tech-stack-data.json",
          templatesDirectory: "agent-templates"
        };
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(`Created ${configPath}`);
      }
    }
    
    // Load config
    const config = loadConfig(configPath);
    console.log(`Using config from: ${configPath}`);
    
    // Determine project root
    if (!projectRoot) {
      projectRoot = path.dirname(configPath);
    }
    
    // Set environment variables for the server
    process.env.CLAUDE_AGENTS_CONFIG = configPath;
    process.env.CLAUDE_AGENTS_ROOT = projectRoot;
    process.env.PORT = options.port;
    
    // Start the server
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    
    // Check if backend exists (for development)
    if (!fs.existsSync(serverPath)) {
      console.error('Error: Backend server not found. This may be due to incomplete installation.');
      console.error('Please reinstall the package or clone the repository for development.');
      process.exit(1);
    }
    
    const serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    // Open browser after a short delay
    if (options.browser !== false) {
      setTimeout(() => {
        const open = require('open');
        open(`http://localhost:${options.port}`);
      }, 2000);
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down Claude Agent Manager...');
      serverProcess.kill();
      process.exit(0);
    });
    
    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
    
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`Server exited with code ${code}`);
        process.exit(code);
      }
    });
  });

// Add init command to create config file
program
  .command('init')
  .description('Initialize a new Claude agents config file in the current directory')
  .action(() => {
    const configPath = path.join(process.cwd(), '.claude-agents.json');
    
    if (fs.existsSync(configPath)) {
      console.error('Config file already exists!');
      process.exit(1);
    }
    
    const defaultConfig = {
      projectName: path.basename(process.cwd()),
      agentsDirectory: ".claude/agents",
      techStackFile: "tech-stack-data.json",
      templatesDirectory: "agent-templates"
    };
    
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`Created ${configPath}`);
    console.log('You can now run "claude-agents" to start the agent manager.');
  });

program.parse();
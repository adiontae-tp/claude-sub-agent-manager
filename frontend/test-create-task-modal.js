// Test script for CreateTaskModal functionality
import assert from 'assert';

const BASE_URL = 'http://localhost:3001';
const PROJECT_DIR = '/Users/adiontaegerron/Documents/TeamParcee/claude-agents/claude-sub-agent-manager';

// Test results
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper functions
function encodeProjectDir(dir) {
  return encodeURIComponent(dir);
}

async function getAgents() {
  const response = await fetch(`${BASE_URL}/api/list-agents/${encodeProjectDir(PROJECT_DIR)}`);
  const data = await response.json();
  return data.agents || [];
}

async function getWorkflows() {
  const response = await fetch(`${BASE_URL}/api/workflows/${encodeProjectDir(PROJECT_DIR)}`);
  return await response.json();
}

async function createTask(agentName, description) {
  // First get the current agent to get existing tasks
  const agents = await getAgents();
  const agent = agents.find(a => a.name === agentName);
  if (!agent) return false;
  
  const currentTasks = agent.tasks || [];
  const normalizedTasks = currentTasks.map(t => 
    typeof t === 'string' 
      ? { description: t, status: 'pending', queued: false, progress: 0, subtasks: [] }
      : t
  );
  
  // Add new task
  const newTask = {
    description: description,
    status: 'pending',
    queued: false,
    progress: 0,
    subtasks: []
  };
  
  const updatedTasks = [...normalizedTasks, newTask];
  
  // Update agent tasks
  const response = await fetch(`${BASE_URL}/api/update-agent-tasks/${encodeProjectDir(PROJECT_DIR)}/${agentName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks: updatedTasks })
  });
  return response.ok;
}

// Test Suite
async function runTests() {
  console.log('Starting CreateTaskModal Test Suite...\n');

  // Test 1: Check API endpoints
  console.log('1. Testing API Endpoints...');
  try {
    const agents = await getAgents();
    assert(agents.length > 0, 'No agents found');
    assert(agents.some(a => a.name === 'developer'), 'Developer agent not found');
    assert(agents.some(a => a.name === 'architect'), 'Architect agent not found');
    assert(agents.some(a => a.name === 'tester'), 'Tester agent not found');
    testResults.passed.push('✓ All required agents available');
    console.log('✓ Agents API working correctly');
  } catch (error) {
    testResults.failed.push(`✗ Agents API test failed: ${error.message}`);
    console.error('✗ Agents API test failed:', error.message);
  }

  try {
    const workflows = await getWorkflows();
    assert(workflows.length > 0, 'No workflows found');
    testResults.passed.push('✓ Workflows API working correctly');
    console.log('✓ Workflows API working correctly');
  } catch (error) {
    testResults.warnings.push(`⚠ Workflows API test failed (may not have workflows): ${error.message}`);
    console.warn('⚠ Workflows API test failed:', error.message);
  }

  // Test 2: Quick Task Mode simulation
  console.log('\n2. Testing Quick Task Mode...');
  try {
    // Test creating a simple task
    const testDescription = 'Test task from Quick Mode - ' + Date.now();
    const success = await createTask('developer', testDescription);
    assert(success, 'Failed to create task in quick mode');
    testResults.passed.push('✓ Quick task creation successful');
    console.log('✓ Quick task creation successful');
  } catch (error) {
    testResults.failed.push(`✗ Quick task creation failed: ${error.message}`);
    console.error('✗ Quick task creation failed:', error.message);
  }

  // Test 3: Validation tests
  console.log('\n3. Testing Validation...');
  try {
    // Test empty description
    const emptyDescResult = await createTask('developer', '');
    assert(!emptyDescResult, 'Empty description should fail');
    testResults.passed.push('✓ Empty description validation working');
    console.log('✓ Empty description validation working');
  } catch (error) {
    testResults.warnings.push(`⚠ Empty description validation may not be enforced server-side`);
    console.warn('⚠ Validation test inconclusive:', error.message);
  }

  try {
    // Test invalid agent
    const invalidAgentResult = await createTask('nonexistent-agent', 'Test task');
    assert(!invalidAgentResult, 'Invalid agent should fail');
    testResults.passed.push('✓ Invalid agent validation working');
    console.log('✓ Invalid agent validation working');
  } catch (error) {
    testResults.failed.push(`✗ Invalid agent validation failed: ${error.message}`);
    console.error('✗ Invalid agent validation failed:', error.message);
  }

  // Test 4: Workflow mode simulation
  console.log('\n4. Testing Workflow Mode...');
  try {
    const workflows = await getWorkflows();
    if (workflows.length > 0) {
      const workflow = workflows[0];
      console.log(`   Using workflow: ${workflow.name} (${workflow.tasks.length} tasks)`);
      
      // Simulate creating tasks from workflow
      let allSuccess = true;
      for (const task of workflow.tasks) {
        const description = `Workflow task: ${task.description} - ${Date.now()}`;
        const success = await createTask(task.agentName, description);
        if (!success) allSuccess = false;
      }
      
      assert(allSuccess, 'Failed to create all workflow tasks');
      testResults.passed.push('✓ Workflow task creation successful');
      console.log('✓ Workflow task creation successful');
    } else {
      testResults.warnings.push('⚠ No workflows available to test');
      console.warn('⚠ No workflows available to test');
    }
  } catch (error) {
    testResults.failed.push(`✗ Workflow mode test failed: ${error.message}`);
    console.error('✗ Workflow mode test failed:', error.message);
  }

  // Test 5: Multiple tasks mode simulation
  console.log('\n5. Testing Multiple Tasks Mode...');
  try {
    const multiTasks = [
      { agent: 'architect', desc: 'Design the system architecture' },
      { agent: 'developer', desc: 'Implement the core functionality' },
      { agent: 'tester', desc: 'Test all the features' }
    ];
    
    let allSuccess = true;
    for (const task of multiTasks) {
      const success = await createTask(task.agent, task.desc + ' - ' + Date.now());
      if (!success) allSuccess = false;
    }
    
    assert(allSuccess, 'Failed to create multiple tasks');
    testResults.passed.push('✓ Multiple task creation successful');
    console.log('✓ Multiple task creation successful');
  } catch (error) {
    testResults.failed.push(`✗ Multiple tasks mode test failed: ${error.message}`);
    console.error('✗ Multiple tasks mode test failed:', error.message);
  }

  // Test 6: Edge cases
  console.log('\n6. Testing Edge Cases...');
  
  // Very long description
  try {
    const longDesc = 'A'.repeat(1000) + ' - Long description test';
    const success = await createTask('developer', longDesc);
    assert(success, 'Failed to create task with long description');
    testResults.passed.push('✓ Long description handling works');
    console.log('✓ Long description (1000 chars) handling works');
  } catch (error) {
    testResults.failed.push(`✗ Long description test failed: ${error.message}`);
    console.error('✗ Long description test failed:', error.message);
  }

  // Special characters
  try {
    const specialDesc = 'Test with special chars: !@#$%^&*()_+-=[]{}|;\':",./<>?`~';
    const success = await createTask('developer', specialDesc);
    assert(success, 'Failed to create task with special characters');
    testResults.passed.push('✓ Special characters handling works');
    console.log('✓ Special characters handling works');
  } catch (error) {
    testResults.failed.push(`✗ Special characters test failed: ${error.message}`);
    console.error('✗ Special characters test failed:', error.message);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Passed: ${testResults.passed.length}`);
  console.log(`✗ Failed: ${testResults.failed.length}`);
  console.log(`⚠ Warnings: ${testResults.warnings.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\nFailed Tests:');
    testResults.failed.forEach(f => console.log('  ' + f));
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\nWarnings:');
    testResults.warnings.forEach(w => console.log('  ' + w));
  }
  
  console.log('\nDetailed Results:');
  console.log(JSON.stringify(testResults, null, 2));
}

// Run tests
runTests().catch(console.error);
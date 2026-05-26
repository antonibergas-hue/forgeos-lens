import React, { useState } from 'react';
import { 
  Server, 
  Box, 
  Shield, 
  Activity, 
  GitBranch 
} from 'lucide-react';

const App = () => {
  const [activeItem, setActiveItem] = useState('overview');

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-inter">
      {/* Sidebar */}
      <div className="flex-shrink-0 w-64 bg-slate-800 border-r border-slate-700 p-4">
        <div className="space-y-6">
          {/* Cluster Group */}
          <div>
            <h3 className="font-medium text-slate-400 mb-2">Cluster</h3>
            <div className="space-y-2">
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'overview' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200'}`}
                onClick={() => setActiveItem('overview')}
              >
                <Server className="w-5 h-5 mr-3" />
                Overview
              </button>
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'nodes' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200 border-b border-slate-700 pb-1'}`}
                onClick={() => setActiveItem('nodes')}
              >
                <Box className="w-5 h-5 mr-3" />
                Nodes
              </button>
            </div>
          </div>
          
          {/* Workloads Group */}
          <div>
            <h3 className="font-medium text-slate-400 mb-2">Workloads</h3>
            <div className="space-y-2">
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'pods' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200'}`}
                onClick={() => setActiveItem('pods')}
              >
                <Activity className="w-5 h-5 mr-3" />
                Pods
              </button>
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'deployments' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200'}`}
                onClick={() => setActiveItem('deployments')}
              >
                <Activity className="w-5 h-5 mr-3" />
                Deployments
              </button>
            </div>
          </div>
          
          {/* Governance Group */}
          <div>
            <h3 className="font-medium text-slate-400 mb-2">Governance</h3>
            <div className="space-y-2">
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'policies' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200'}`}
                onClick={() => setActiveItem('policies')}
              >
                <Shield className="w-5 h-5 mr-3" />
                Policies
              </button>
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'rbac' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200'}`}
                onClick={() => setActiveItem('rbac')}
              >
                <Shield className="w-5 h-5 mr-3" />
                RBAC
              </button>
            </div>
          </div>
          
          {/* Logs Group */}
          <div>
            <h3 className="font-medium text-slate-400 mb-2">Logs</h3>
            <div className="space-y-2">
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'logs' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200'}`}
                onClick={() => setActiveItem('logs')}
              >
                <Activity className="w-5 h-5 mr-3" />
                Logs
              </button>
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'events' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200'}`}
                onClick={() => setActiveItem('events')}
              >
                <Activity className="w-5 h-5 mr-3" />
                Events
              </button>
            </div>
          </div>
          
          {/* Contexts Group */}
          <div>
            <h3 className="font-medium text-slate-400 mb-2">Contexts</h3>
            <div className="space-y-2">
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'context1' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200'}`}
                onClick={() => setActiveItem('context1')}
              >
                <GitBranch className="w-5 h-5 mr-3" />
                Context 1
              </button>
              <button 
                className={`flex items-center w-full text-left transition-all duration-200 ${activeItem === 'context2' ? 'text-slate-100 border-l-4 border-cyan-400' : 'text-slate-300 hover:text-slate-200'}`}
                onClick={() => setActiveItem('context2')}
              >
                <GitBranch className="w-5 h-5 mr-3" />
                Context 2
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Pane */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-slate-100">ForgeOS Lens</h1>
          <p className="text-slate-400">Welcome to the ForgeOS Lens dashboard. Select an item from the sidebar to begin.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
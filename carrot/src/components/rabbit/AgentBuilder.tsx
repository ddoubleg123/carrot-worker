'use client';

import { useState } from 'react';
import { X, Upload, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { Agent } from '@/lib/agents';

interface AgentBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: Omit<Agent, 'id'>) => void;
}

interface AgentForm {
  name: string;
  avatar: string;
  domains: string[];
  strengths: string[];
  limits: string[];
  samplePrompts: string[];
  personality: {
    tone: 'formal' | 'casual' | 'academic' | 'witty';
    expertise: string;
    approach: string;
  };
}

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', description: 'Professional and structured' },
  { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
  { value: 'academic', label: 'Academic', description: 'Scholarly and precise' },
  { value: 'witty', label: 'Witty', description: 'Humorous and clever' }
] as const;

export default function AgentBuilder({ isOpen, onClose, onSave }: AgentBuilderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<AgentForm>({
    name: '',
    avatar: '',
    domains: [''],
    strengths: [''],
    limits: [''],
    samplePrompts: ['', '', ''],
    personality: {
      tone: 'formal',
      expertise: '',
      approach: ''
    }
  });
  const [testQuestions, setTestQuestions] = useState(['', '', '']);
  const [testResults, setTestResults] = useState<Array<{ question: string; answer: string; pass: boolean } | null>>([null, null, null]);

  if (!isOpen) return null;

  const addArrayItem = (field: keyof Pick<AgentForm, 'domains' | 'strengths' | 'limits'>) => {
    setForm(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: keyof Pick<AgentForm, 'domains' | 'strengths' | 'limits'>, index: number) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field: keyof Pick<AgentForm, 'domains' | 'strengths' | 'limits'>, index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const updateSamplePrompt = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      samplePrompts: prev.samplePrompts.map((prompt, i) => i === index ? value : prompt)
    }));
  };

  const runTests = async () => {
    // Simulate AI testing
    const results = testQuestions.map((question, index) => {
      if (!question.trim()) return null;
      
      // Mock test logic - in real implementation, this would call your AI service
      const mockAnswer = `As ${form.name}, I would approach this ${form.personality.tone}ly, focusing on ${form.domains[0]?.toLowerCase() || 'the topic'}.`;
      const pass = Math.random() > 0.3; // 70% pass rate for demo
      
      return {
        question,
        answer: mockAnswer,
        pass
      };
    });
    
    setTestResults(results);
  };

  const canProceed = (step: number) => {
    switch (step) {
      case 1:
        return form.name.trim() && form.domains.some(d => d.trim());
      case 2:
        return form.personality.expertise.trim() && form.personality.approach.trim();
      case 3:
        return form.strengths.some(s => s.trim()) && form.limits.some(l => l.trim());
      case 4:
        return form.samplePrompts.some(p => p.trim());
      default:
        return true;
    }
  };

  const handleSave = () => {
    const cleanedForm = {
      ...form,
      domains: form.domains.filter(d => d.trim()),
      strengths: form.strengths.filter(s => s.trim()),
      limits: form.limits.filter(l => l.trim()),
      samplePrompts: form.samplePrompts.filter(p => p.trim())
    };
    
    onSave(cleanedForm);
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Marketing Expert"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Avatar
                  </label>
                  <div className="flex items-center space-x-4">
                    {form.avatar ? (
                      <img src={form.avatar} alt="Avatar" className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 text-lg font-medium">
                          {form.name.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                      <Upload className="w-4 h-4 inline mr-2" />
                      Upload Image
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain Expertise *
                  </label>
                  <div className="space-y-2">
                    {form.domains.map((domain, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={domain}
                          onChange={(e) => updateArrayItem('domains', index, e.target.value)}
                          placeholder="e.g., Digital Marketing"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        {form.domains.length > 1 && (
                          <button
                            onClick={() => removeArrayItem('domains', index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem('domains')}
                      className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Domain</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personality & Voice</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Communication Tone
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {TONE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setForm(prev => ({ 
                          ...prev, 
                          personality: { ...prev.personality, tone: option.value } 
                        }))}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          form.personality.tone === option.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area of Expertise *
                  </label>
                  <input
                    type="text"
                    value={form.personality.expertise}
                    onChange={(e) => setForm(prev => ({ 
                      ...prev, 
                      personality: { ...prev.personality, expertise: e.target.value } 
                    }))}
                    placeholder="e.g., Content strategy and brand messaging"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approach & Style *
                  </label>
                  <textarea
                    value={form.personality.approach}
                    onChange={(e) => setForm(prev => ({ 
                      ...prev, 
                      personality: { ...prev.personality, approach: e.target.value } 
                    }))}
                    placeholder="e.g., Data-driven, focuses on ROI and measurable outcomes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Capabilities & Limits</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Strengths *
                  </label>
                  <div className="space-y-2">
                    {form.strengths.map((strength, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={strength}
                          onChange={(e) => updateArrayItem('strengths', index, e.target.value)}
                          placeholder="e.g., Campaign optimization"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        {form.strengths.length > 1 && (
                          <button
                            onClick={() => removeArrayItem('strengths', index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem('strengths')}
                      className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Strength</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Known Limitations *
                  </label>
                  <div className="space-y-2">
                    {form.limits.map((limit, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={limit}
                          onChange={(e) => updateArrayItem('limits', index, e.target.value)}
                          placeholder="e.g., Technical SEO implementation"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        {form.limits.length > 1 && (
                          <button
                            onClick={() => removeArrayItem('limits', index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem('limits')}
                      className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Limitation</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Prompts</h3>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Provide 3 example prompts that showcase your agent's capabilities.
                </p>
                
                {form.samplePrompts.map((prompt, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sample Prompt {index + 1}
                    </label>
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => updateSamplePrompt(index, e.target.value)}
                      placeholder="e.g., Create a social media strategy for a tech startup"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Your Agent</h3>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Test your agent with sample questions to ensure it responds appropriately.
                </p>
                
                {testQuestions.map((question, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Test Question {index + 1}
                    </label>
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setTestQuestions(prev => prev.map((q, i) => i === index ? e.target.value : q))}
                      placeholder="Ask your agent something..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    
                    {testResults[index] && (
                      <div className={`p-3 rounded-lg border ${
                        testResults[index]?.pass 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          {testResults[index]?.pass ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={`text-sm font-medium ${
                            testResults[index]?.pass ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {testResults[index]?.pass ? 'Pass' : 'Needs Improvement'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          {testResults[index]?.answer}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={runTests}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Run Tests
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Custom Agent</h2>
            <div className="text-sm text-gray-500 mt-1">
              Step {currentStep} of 5
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full ${
                  step <= currentStep ? 'bg-purple-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex space-x-3">
            {currentStep < 5 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed(currentStep)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Agent
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

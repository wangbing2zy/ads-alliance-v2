import axios from 'axios';
import { SettingsModel } from '../models/settingsModel.js';

export class AIProviderService {
  constructor(settingsModel) {
    this.settingsModel = settingsModel;
    this.activeModel = 'deepseek';
    this.apiKey = '';
    this.baseUrl = '';
    this.maxTokens = 1000;
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Configure the AI provider with current settings.
   */
  configure(model, apiKey, baseUrl, maxTokens) {
    this.activeModel = model || 'deepseek';
    this.apiKey = apiKey || '';
    this.baseUrl = baseUrl || (this.activeModel === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com');
    this.maxTokens = maxTokens || 1000;
  }

  /**
   * Reload configuration from settings model.
   */
  reloadConfig() {
    const model = this.settingsModel.get('ai_model') || 'deepseek';
    const apiKey = model === 'deepseek'
      ? (this.settingsModel.get('ai_deepseek_api_key') || '')
      : (this.settingsModel.get('ai_chatgpt_api_key') || '');
    const baseUrl = model === 'deepseek'
      ? (this.settingsModel.get('ai_deepseek_base_url') || 'https://api.deepseek.com')
      : (this.settingsModel.get('ai_chatgpt_base_url') || 'https://api.openai.com');
    const maxTokens = parseInt(this.settingsModel.get('ai_max_token_per_request') || '1000', 10);
    this.configure(model, apiKey, baseUrl, maxTokens);
  }

  /**
   * Analyze a context using the active AI model.
   * @param {object} context - AIContext object
   * @returns {Promise<object>} AIResult
   */
  async analyze(context) {
    this.reloadConfig();

    if (!this.apiKey) {
      throw new Error('AI API Key 未配置');
    }

    const prompt = this._buildPrompt(context);
    const startTime = Date.now();

    try {
      let response;
      if (this.activeModel === 'deepseek') {
        response = await this._callDeepSeek(prompt);
      } else {
        response = await this._callChatGPT(prompt);
      }

      const duration = Date.now() - startTime;
      const result = this._parseResponse(response);
      result.duration_ms = duration;
      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      throw Object.assign(err, { duration_ms: duration });
    }
  }

  /**
   * Build structured prompt from context.
   */
  _buildPrompt(context) {
    return `You are an AI assistant monitoring an ad-play automation system. Analyze the following situation and return a JSON response.

## Current Situation
- Event Type: ${context.eventType}
- Task ID: ${context.taskId || 'N/A'}
- Proxy ID: ${context.proxyId || 'N/A'}
- Proxy IP: ${context.proxyIp || 'N/A'}
- Error Message: ${context.errorMessage || 'N/A'}
- Proxy Status: ${context.proxyStatus || 'N/A'}
- Task Play Count: ${context.taskPlayCount || 0}
- Task Error Count: ${context.taskErrorCount || 0}
${context.recentErrors && context.recentErrors.length > 0 ? `- Recent Errors:\n${context.recentErrors.map(e => `  - ${e.message}`).join('\n')}` : ''}

## Available Actions
- switch_proxy: Mark current proxy as unavailable and switch to a different one
- retry_task: Suggest retrying the task (system will auto-retry next cycle)
- report_only: Only log the diagnosis, no automated action
- restart_task: Stop and restart the task (use with caution)

## Response Format
Return ONLY a valid JSON object:
{
  "diagnosis": "Brief description of what went wrong",
  "action": "one of: switch_proxy, retry_task, report_only, restart_task",
  "confidence": 0.0 to 1.0
}`;
  }

  /**
   * Call DeepSeek API (compatible with OpenAI format).
   */
  async _callDeepSeek(prompt) {
    const url = `${this.baseUrl}/v1/chat/completions`;
    const response = await axios.post(url, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a diagnostic AI for an ad automation system. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: this.maxTokens,
      temperature: 0.3,
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout,
    });
    return response.data;
  }

  /**
   * Call ChatGPT API (OpenAI format).
   */
  async _callChatGPT(prompt) {
    const url = `${this.baseUrl}/v1/chat/completions`;
    const response = await axios.post(url, {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a diagnostic AI for an ad automation system. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: this.maxTokens,
      temperature: 0.3,
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout,
    });
    return response.data;
  }

  /**
   * Parse AI response into structured result.
   */
  _parseResponse(response) {
    const choice = response.choices?.[0];
    const content = choice?.message?.content || '';
    const usage = response.usage || {};

    let parsed = null;
    try {
      // Try to extract JSON from the response (might have markdown code block wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If JSON parsing fails, create a default result
    }

    return {
      diagnosis: parsed?.diagnosis || content.slice(0, 200),
      action: parsed?.action || 'report_only',
      confidence: parsed?.confidence || 0,
      rawResponse: content,
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
    };
  }

  /**
   * Test connection to the active AI model.
   */
  async testConnection() {
    this.reloadConfig();

    if (!this.apiKey) {
      return false;
    }

    try {
      if (this.activeModel === 'deepseek') {
        await this._callDeepSeek('Respond with OK');
      } else {
        await this._callChatGPT('Respond with OK');
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current active model name.
   */
  getActiveModel() {
    return this.activeModel;
  }
}

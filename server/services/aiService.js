import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeUserQuery } from '../config/database.js';

class AIService {
  constructor() {
    this.providers = {
      chatgpt: {
        baseURL: 'https://api.openai.com/v1',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo']
      },
      gemini: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        models: ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro']
      },
      huggingface: {
        baseURL: 'https://api-inference.huggingface.co/models',
        models: ['microsoft/DialoGPT-large', 'facebook/blenderbot-400M-distill']
      }
    };
  }

  async sendMessage(provider, model, message, systemPrompt, temperature = 0.7, maxTokens = 1000) {
    try {
      switch (provider) {
        case 'chatgpt':
          return await this.callOpenAI(model, message, systemPrompt, temperature, maxTokens);
        case 'gemini':
          return await this.callGemini(model, message, systemPrompt, temperature, maxTokens);
        case 'huggingface':
          return await this.callHuggingFace(model, message, systemPrompt, temperature, maxTokens);
        default:
          throw new Error(`Provedor não suportado: ${provider}`);
      }
    } catch (error) {
      console.error(`Erro na IA ${provider}:`, error);
      throw error;
    }
  }

  async callOpenAI(model, message, systemPrompt, temperature, maxTokens) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada. Configure uma chave real da OpenAI no arquivo .env');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt || 'Você é um assistente útil.' },
          { role: 'user', content: message }
        ],
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  async callGemini(model, message, systemPrompt, temperature, maxTokens, customApiKey = null) {
    const apiKey = customApiKey || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY não configurada. Configure uma chave real do Google no arquivo .env');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' });

    const prompt = systemPrompt ? `${systemPrompt}\n\nUser: ${message}` : message;
    
    const result = await geminiModel.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    });

    const response = await result.response;
    return response.text();
  }

  async callHuggingFace(model, message, systemPrompt, temperature, maxTokens) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('HUGGINGFACE_API_KEY não configurada. Configure uma chave real do Hugging Face no arquivo .env');
    }

    const prompt = systemPrompt ? `${systemPrompt}\n\nUser: ${message}\nAssistant:` : `User: ${message}\nAssistant:`;

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model || 'microsoft/DialoGPT-large'}`,
      {
        inputs: prompt,
        parameters: {
          max_length: maxTokens,
          temperature,
          do_sample: true,
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data[0]?.generated_text || response.data.generated_text || '';
    return result.replace(prompt, '').trim();
  }

  // RAG - Buscar conhecimento relevante
  async searchKnowledge(userId, query, limit = 5) {
    try {
      const results = await executeUserQuery(userId, `
        SELECT id, title, content, category, tags
        FROM knowledge_base 
        WHERE is_active = true 
        AND (MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE)
             OR title LIKE ? OR content LIKE ?)
        ORDER BY 
          MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE) DESC,
          created_at DESC
        LIMIT ?
      `, [query, `%${query}%`, `%${query}%`, query, limit]);

      return results;
    } catch (error) {
      console.error('Erro ao buscar conhecimento:', error);
      return [];
    }
  }

  // Construir prompt do agente
  buildAgentPrompt(agent, basePrompt) {
    let fullPrompt = basePrompt || 'Você é um assistente útil.';
    
    if (agent.description) {
      fullPrompt += `\n\nDescrição: ${agent.description}`;
    }
    
    if (agent.objective) {
      fullPrompt += `\n\nObjetivo: ${agent.objective}`;
    }
    
    if (agent.personality) {
      const personalityMap = {
        'professional': 'Mantenha um tom profissional e formal em suas respostas.',
        'friendly': 'Seja amigável, caloroso e acolhedor em suas interações.',
        'casual': 'Use um tom descontraído e informal, como uma conversa entre amigos.',
        'formal': 'Mantenha extrema formalidade e cortesia em todas as respostas.'
      };
      
      const personalityInstruction = personalityMap[agent.personality] || personalityMap['professional'];
      fullPrompt += `\n\nPersonalidade: ${personalityInstruction}`;
    }
    
    return fullPrompt;
  }

  async generateWithRAG(userId, provider, model, message, agent, temperature, maxTokens) {
    try {
      // Buscar conhecimento relevante
      const knowledge = await this.searchKnowledge(userId, message);
      
      // Construir prompt completo com configurações do agente
      let enhancedPrompt = this.buildAgentPrompt(agent, agent.system_prompt);
      
      if (knowledge.length > 0) {
        const context = knowledge.map(k => `${k.title}: ${k.content}`).join('\n\n');
        enhancedPrompt += `\n\nContexto relevante da base de conhecimento:\n${context}\n\nUse essas informações para responder quando relevante, mas mantenha sua personalidade e objetivos.`;
      }

      return await this.sendMessage(provider, model, message, enhancedPrompt, temperature, maxTokens);
    } catch (error) {
      console.error('Erro no RAG:', error);
      // Fallback para resposta sem RAG
      const fallbackPrompt = this.buildAgentPrompt(agent, agent.system_prompt);
      return await this.sendMessage(provider, model, message, fallbackPrompt, temperature, maxTokens);
    }
  }
}

export default new AIService();
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, X, User, Sparkles, HelpCircle, FileCheck2, Headphones } from 'lucide-react';
import { playPremiumHapticSound } from './HapticButton';

interface Message {
  id: string;
  sender: 'user' | 'advisor';
  text: string;
  timestamp: string;
}

interface LiveChatProps {
  lang: 'en' | 'es' | 'de';
  onClose: () => void;
  onOpenProposal: () => void;
}

export const LiveChatModal: React.FC<LiveChatProps> = ({ lang, onClose, onOpenProposal }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getSystemGreeting = () => {
    switch (lang) {
      case 'es':
        return '¡Hola! Bienvenido al canal de Asesoría en Vivo de SpotCLM. Soy Marcus, su consultor principal de CLM. ¿Qué plataforma o desafío de automatización legal tiene en mente hoy? Podríamos hablar de integraciones con Salesforce, migración de PDF historiales, o soporte pos-implementación.';
      case 'de':
        return 'Willkommen im SpotCLM Live-Consulting-Chat. Ich bin Marcus, Ihr leitender CLM-Berater. Welches System oder welche Integrationsaufgabe steht bei Ihnen an? Gerne vergleiche ich Ironclad, Icertis, SirionLabs oder Leah für Ihre rechtliche Infrastruktur.';
      default:
        return 'Welcome to SpotCLM Live Advisory Chat. I am Marcus, your lead CLM consulting advisor. What system or contract workflow automation challenge is on your mind today? I can help guide your Salesforce connectivity sync, historical data migrations, or support hypercare SLAs.';
    }
  };

  useEffect(() => {
    setMessages([
      {
        id: 'initial',
        sender: 'advisor',
        text: getSystemGreeting(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const suggestRepliesMap = {
    en: [
      'Compare Ironclad vs Icertis',
      'Tell me about Indian delivery cost advantage',
      'What are SirionLabs support SLAs?',
      'How does Leah AI contract drafting work?'
    ],
    es: [
      'Comparar Ironclad vs Icertis',
      '¿Cómo funciona el soporte continuo?',
      '¿Qué costo tiene la migración con IA?',
      '¿Cómo integra Leah AI los borradores?'
    ],
    de: [
      'Vergleich Ironclad vs Icertis',
      'Wie funktionieren Service SLAs?',
      'Vorteile von SpotCLM',
      'Wie funktioniert Leah Künstliche Intelligenz?'
    ]
  };

  const suggestReplies = suggestRepliesMap[lang] || suggestRepliesMap.en;

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    playPremiumHapticSound('click');

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate professional response after a short organic delay
    setTimeout(() => {
      setIsTyping(false);
      let responseText = '';

      const query = text.toLowerCase();
      if (query.includes('ironclad') || query.includes('salesforce')) {
        responseText = {
          en: 'Ironclad is exceptional for rapid, sales-driven commercial agreements. We build deep integrations with Salesforce CRM—enabling sales staff to launch contract requests directly from accounts, auto-fill pricing tables, and handle sequential approvals without moving between tabs. It reduces average turnaround times by up to 72%.',
          es: 'Ironclad es ideal para acuerdos comerciales dinámicos. Diseñamos integraciones completas con Salesforce para que ventas pueda lanzar solicitudes directamente, rellenar datos y aprobar contratos sin cambiar de pestaña. Esto reduce la espera en un 72%.',
          de: 'Ironclad ist hervorragend für schnelle, vertriebsorientierte Handelsabkommen geeignet. Wir entwickeln tiefe Salesforce-Integrationen, damit Ihr Vertriebs-Team Anfragen direkt aus Accounts heraus starten und genehmigen kann. Das senkt die Durchlaufzeit um bis zu 72%.'
        }[lang];
      } else if (query.includes('icertis')) {
        responseText = {
          en: 'Icertis is the premier choice for global, highly-regulated enterprise accounts. It offers peerless contract obligation tracking and regulatory safety reporting. SpotCLM specializes in provisioning multi-entity hierarchies, international tax rule maps, and corporate governance rails within Icertis dashboards.',
          es: 'Icertis es la opción líder para cuentas globales reguladas. Ofrece un seguimiento incomparable de obligaciones contractuales externas. Diseñamos estructuras multi-empresa y políticas de gobernanza corporativa dentro de los paneles personalizados de Icertis.',
          de: 'Icertis ist die Premium-Wahl für globale und stark regulierte Konzerne. Es zeichnet sich durch überlegene Pflichten-Verfolgung aus. SpotCLM strukturiert steuerliche Zuweisungen und globale Compliance-Vorgaben innerhalb Ihrer Icertis-Dashboards.'
        }[lang];
      } else if (query.includes('sirion') || query.includes('support') || query.includes('sla')) {
        responseText = {
          en: 'SirionLabs excels at supplier lifecycle management and active obligation auditing. SpotCLM supports Sirion with dedicated helpdesk teams, workflow micro-optimizations, and quarterly performance reviews. Our standard Support SLA guarantees a certified advisor handles Tier-1 blockages in under 4 hours.',
          es: 'SirionLabs destaca en la gestión de proveedores y auditoría de obligaciones de servicio. Apoyamos a SirionLabs con micro-optimaciones constantes y mesas de ayuda. Nuestra garantía de SLA de Soporte es de solución a incidencias críticas en menos de 4 horas.',
          de: 'SirionLabs eignet sich perfekt für Lieferantenbeziehungen. Wir unterstützen SirionLabs mit On-Demand-Spezialisten und Workflow-Auditierungen. Unser standardmäßiges Support-SLA garantiert qualifizierte Unterstützung für Tier-1 Ticket innerhalb von 4 Stunden.'
        }[lang];
      } else if (query.includes('leah') || query.includes('inteligencia') || query.includes('ai') || query.includes('draft')) {
        responseText = {
          en: 'Leah (from ContractPodAI) uses state-of-the-art semantic models. We integrate Leah to automate contextual redlining and extract key metadata parameters from incoming vendor paper. Our configurations help corporate teams instantly contrast paper patterns with standard company thresholds.',
          es: 'Leah de ContractPodAI cuenta con una excelente base de modelos semánticos. La implementamos para automatizar sugerencias de rediseño y revisar borradores de terceros de manera inmediata para contrastar desviaciones con respecto a su límite de responsabilidad.',
          de: 'Leah (ContractPodAI) bietet erstklassige semantische Textprüfungen. Wir implementieren Leah, um Ihre Redlines zu automatisieren und die Abweichungen eingehender Verträge sofort mit Ihren Unternehmens-Vorgaben zu vergleichen.'
        }[lang];
      } else if (query.includes('india') || query.includes('cost') || query.includes('delivery')) {
        responseText = {
          en: 'SpotCLM leverages a dual-shore model. We have Senior Advisory partners in the US/Europe for strategic mapping and workshops, combined with our Certified Delivery Specialists based in India. This blend delivers premier-quality certified configurations at over 50% savings compared to traditional domestic consulting.',
          es: 'SpotCLM utiliza un esquema híbrido. Contamos con socios de consultoría sênior locales para los talleres, apoyados por técnicos certificados en India. Esto garantiza la máxima calidad con ahorros superiores al 50% frente a consultoras tradicionales.',
          de: 'SpotCLM nutzt ein Offshore-Mischmodell. Erfahrene Beratungspartner in Europa koordinieren Requirements-Engineering und Workshops, während unser zertifiziertes Lieferzentrum in Indien die Konfigurationen übernimmt. Das spart über 50% Projektkosten.'
        }[lang];
      } else {
        responseText = {
          en: "That is an excellent point. Translating complex system requirements to smooth digital user flows is exactly where SpotCLM excels. I recommend opening our custom advisory form so our engineers can review your specific pipeline objectives and provide a structured fixed-cost blueprint.",
          es: "Es un punto fundamental. Traducir flujos legales en sistemas interactivos y limpios es precisamente la especialidad de SpotCLM. Le sugiero rellenar el formulario de consulta en vivo para recibir un análisis de alcance de costos fijos.",
          de: "Das ist ein wertvoller Punkt. Juristische Anforderungen in glatte Datenprozesse zu übersetzen, ist die Kernkompetenz von SpotCLM. Ich empfehle Ihnen das Ausfüllen unseres Formulars für ein unverbindliches Angebot."
        }[lang];
      }

      const replyMsg: Message = {
        id: Math.random().toString(),
        sender: 'advisor',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, replyMsg]);
      playPremiumHapticSound('success');
    }, 1200);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-feature shadow-floating overflow-hidden flex flex-col h-[580px] text-left"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-sky-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                MC
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm tracking-wide">Marcus Vance</h4>
              <span className="text-[11px] text-indigo-100 uppercase tracking-widest block font-medium">SpotCLM Senior Consultant</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Panel Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/40" ref={scrollRef}>
          {messages.map((m) => {
            const isMe = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-control flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isMe ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {isMe ? <User className="w-3.5 h-3.5" /> : 'M'}
                </div>
                <div className="max-w-[80%] flex flex-col">
                  <div className={`p-3.5 rounded-card text-xs leading-relaxed ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/50 dark:border-slate-800 rounded-tl-none shadow-rest'
                  }`}>
                    {m.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block px-1 self-end">
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-control bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700">
                M
              </div>
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-card border border-slate-200/50 dark:border-slate-800 rounded-tl-none flex items-center gap-1.5 shadow-rest">
                <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="px-6 py-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-900 flex flex-wrap gap-1.5">
          {suggestReplies.map((tag) => (
            <button
              key={tag}
              onClick={() => handleSend(tag)}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 rounded-control cursor-pointer transition-colors max-w-full truncate font-medium"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Form Entry Direct Action Prompt */}
        <div className="px-6 py-2 bg-indigo-50/40 dark:bg-indigo-950/20 border-t border-indigo-100/10 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-light pr-2">Need a formal scope assessment?</span>
          <button
            onClick={() => {
              playPremiumHapticSound('open');
              onOpenProposal();
              onClose();
            }}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex-shrink-0"
          >
            Launch Advisory Form →
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
            placeholder={lang === 'es' ? 'Escriba un mensaje aquí...' : lang === 'de' ? 'Hier Nachricht eingeben...' : 'Type a query here...'}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-control px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => handleSend(inputValue)}
            className="p-3 bg-indigo-600 text-white rounded-control hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

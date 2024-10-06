'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useSpring, useAnimation, useReducedMotion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Brain, MessageCircle, Heart, Shield, Send, Menu, X, Star, Users, Zap, Check, Quote, Info, ArrowRight, Sparkles, Lightbulb, Smile, Moon, Sun, Mic, MicOff, Volume2 } from 'lucide-react'
import Link from 'next/link'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const MODEL_NAME = "gemini-1.0-pro"
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string

const FIXED_PROMPT = `
You are a supportive and empathetic AI assistant designed to provide mental health support and help users build emotional resilience. Your responses should be caring, non-judgmental, and aimed at promoting emotional well-being. In addition to providing emotional support, you actively track and analyze the user's mood patterns, offering personalized emotional resilience plans and adaptive coping strategies. You provide preemptive recommendations based on emotional triggers and suggest progressive emotional growth challenges to help users strengthen their mental health over time.
You offer real-time coping strategies in moments of distress and provide positive reflection through automated journaling. You collaborate with the user to create mental health action plans and adapt your guidance based on what works best for them. Always remind the user that you are an AI, encourage self-care, and suggest professional help when needed.
`

function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm Serenity, your AI companion. How can I support you today?" }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const micControls = useAnimation()
  const waveformControls = useAnimation()
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    scrollToBottom()
    synthRef.current = window.speechSynthesis
  }, [messages])

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const response = await runChat(input)
      const assistantMessage = { role: 'assistant', content: response }
      setMessages(prev => [...prev, assistantMessage])
      speakResponse(response)
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const toggleVoiceInput = useCallback(() => {
    if (!isListening) {
      startListening()
    } else {
      stopListening()
    }
  }, [isListening])

  const startListening = useCallback(() => {
    setIsListening(true)
    micControls.start({
      scale: [1, 1.2, 1],
      rotate: [0, 10, -10, 0],
      transition: { duration: 1, repeat: Infinity }
    })
    waveformControls.start({
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 }
    })

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('')
      setInput(transcript)
    }

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error)
      stopListening()
    }

    recognitionRef.current.start()
  }, [micControls, waveformControls])

  const stopListening = useCallback(() => {
    setIsListening(false)
    micControls.stop()
    waveformControls.start({
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.3 }
    })
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [micControls, waveformControls])

  const speakResponse = (text: string) => {
    if (synthRef.current) {
      setIsSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onend = () => setIsSpeaking(false)
      synthRef.current.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  async function runChat(prompt: string) {
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    }

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ]

    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: [
        {
          role: "user",
          parts: [{ text: FIXED_PROMPT }],
        },
      ],
    })

    const result = await chat.sendMessage(prompt)
    const response = result.response
    return response.text()
  }

  const chatContainerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  }

  const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }
  }

  const waveformVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  }

  return (
    <motion.div 
      className="flex flex-col h-[600px] max-w-2xl mx-auto bg-background rounded-xl shadow-xl overflow-hidden border border-primary/20"
      variants={chatContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="flex items-center justify-between p-4 border-b bg-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div 
          className="flex items-center space-x-2"
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Avatar>
            <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Serenity" />
            <AvatarFallback><Brain className="h-6 w-6" /></AvatarFallback>
          </Avatar>
          <span className="font-semibold text-lg">Serenity</span>
        </motion.div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button variant="ghost" size="icon">
                  <Info className="h-5 w-5" />
                  <span className="sr-only">AI Information</span>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Serenity is an AI assistant designed to provide mental health support.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <motion.div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20,
                  delay: index * 0.1 // Stagger effect
                }}
              >
                <p className="text-sm">{message.content}</p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex justify-start"
          >
            <div className="max-w-[80%] p-3 rounded-lg bg-muted">
              <motion.div
                variants={{
                  animate: {
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                    borderRadius: ["20%", "50%", "20%"],
                    transition: {
                      duration: 2,
                      ease: "easeInOut",
                      times: [0, 0.5, 1],
                      repeat: Infinity,
                      repeatType: "loop"
                    }
                  }
                }}
                animate="animate"
                className="w-8 h-8 bg-primary/20"
              >
                <motion.div
                  className="w-full h-full flex items-center justify-center"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 2,
                    ease: "linear",
                    repeat: Infinity
                  }}
                >
                  <div className="w-3 h-3 bg-primary rounded-full" />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>
      <motion.form 
        onSubmit={handleSubmit} 
        className="p-4 border-t"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1"
          />
          <motion.div className="relative">
            <motion.div animate={micControls}>
              <Button 
                type="button" 
                size="icon" 
                onClick={toggleVoiceInput} 
                className={isListening ? 'bg-primary text-primary-foreground' : ''}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                <span className="sr-only">{isListening ? 'Stop voice input' : 'Start voice input'}</span>
              </Button>
            </motion.div>
            <AnimatePresence>
              {isListening && (
                <motion.div
                  className="absolute -top-40 left-1/2 transform -translate-x-1/2"
                  variants={waveformVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <motion.div 
                    className="relative w-40 h-40"
                    animate={waveformControls}
                  >
                    <motion.div
                      className="absolute inset-0 bg-primary/20 rounded-full"
                      variants={{
                        animate: {
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 0.3, 0.7],
                          transition: {
                            duration: 1.5,
                            ease: "easeInOut",
                            times: [0, 0.5, 1],
                            repeat: Infinity,
                            repeatType: "reverse" as const
                          }
                        }
                      }}
                      animate="animate"
                    />
                    {[...Array(3)].map((_, index) => (
                      <motion.div
                        key={index}
                        className="absolute inset-0 border-2 border-primary rounded-full"
                        custom={index}
                        variants={{
                          animate: (i: number) => ({
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5],
                            transition: {
                              duration: 2,
                              ease: "easeInOut",
                              times: [0, 0.5, 1],
                              repeat: Infinity,
                              repeatType: "reverse" as const,
                              delay: i * 0.2
                            }
                          })
                        }}
                        animate="animate"
                      />
                    ))}
                    {[...Array(20)].map((_, index) => (
                      <motion.div
                        key={`particle-${index}`}
                        className="absolute w-2 h-2 bg-primary rounded-full"
                        style={{
                          left: `${50 + Math.cos(index * Math.PI / 10) * 20}%`,
                          top: `${50 + Math.sin(index * Math.PI / 10) * 20}%`,
                        }}
                        custom={index}
                        variants={{
                          animate: (i: number) => ({
                            y: [0, -20, 0],
                            x: Math.sin(i) * 10,
                            opacity: [0, 1, 0],
                            scale: [0.8, 1, 0.8],
                            transition: {
                              duration: 2,
                              ease: "easeInOut",
                              times: [0, 0.5, 1],
                              repeat: Infinity,
                              repeatType: "reverse" as const,
                              delay: i * 0.1
                            }
                          })
                        }}
                        animate="animate"
                      />
                    ))}
                    <motion.div 
                      className="absolute inset-0 flex items-center justify-center"
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                        transition: {
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "reverse"
                        }
                      }}
                    >
                      <Mic className="h-12 w-12 text-primary" />
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button type="submit" size="icon" disabled={isTyping}>
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              type="button" 
              size="icon" 
              onClick={isSpeaking ? stopSpeaking : () => speakResponse(messages[messages.length - 1].content)}
            >
              {isSpeaking ? (
                <motion.div
                  variants={{
                    animate: {
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0],
                      transition: {
                        duration: 1.5,
                        ease: "easeInOut",
                        times: [0, 0.25, 0.75, 1],
                        repeat: Infinity,
                        repeatType: "reverse" as const
                      }
                    }
                  }}
                  animate="animate"
                  className="relative"
                >
                  <Volume2 className="h-5 w-5" />
                  {[...Array(3)].map((_, index) => (
                    <motion.div
                      key={`wave-${index}`}
                      className="absolute left-full top-1/2 w-2 h-2 bg-primary rounded-full"
                      animate={{
                        x: [0, 10, 0],
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: index * 0.2,
                      }}
                    />
                  ))}
                </motion.div>
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
              <span className="sr-only">{isSpeaking ? 'Stop speaking' : 'Read response'}</span>
            </Button>
          </motion.div>
        </div>
      </motion.form>
    </motion.div>
  )
}

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [theme, setTheme] = useState('light')
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.8])
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    document.body.style.fontFamily = "'Poppins', sans-serif"
    return () => {
      document.body.style.fontFamily = ''
    }
  }, [])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark')
  }

  const springConfig = { stiffness: 100, damping: 10, restDelta: 0.001 }
  const x = useSpring(0, springConfig)
  const y = useSpring(0, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [x, y])

  const fadeInUpVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6,
        type: "spring",
        stiffness: 100,
        damping: 10
      } 
    }
  }

  const staggerChildrenVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.3
      } 
    }
  }

  const floatingAnimation = {
    y: shouldReduceMotion ? 0 : [0, -10, 0],
    transition: {
      duration: 5,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut"
    }
  }

  return (
    <div className={`flex flex-col min-h-screen bg-background ${theme === 'dark' ? 'dark' : ''}`}>
      <motion.header 
        className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="container flex h-14 items-center justify-between px-4 md:px-6">
          <Link className="flex items-center space-x-2" href="/">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.2 }}
              transition={{ duration: 0.6 }}
            >
              <Brain className="h-6 w-6 text-primary" />
            </motion.div>
            <motion.span 
              className="font-bold text-lg md:text-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Serenity
            </motion.span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {['Features', 'Demo', 'Testimonials', 'Pricing'].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
              >
                <Link 
                  href={`#${item.toLowerCase()}`} 
                  className="hover:text-primary transition-colors relative group"
                >
                  {item}
                  <motion.span
                    className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </Link>
              </motion.div>
            ))}
          </nav>
          <div className="flex items-center space-x-2">
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button variant="outline" className="hidden md:inline-flex">Log in</Button>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button className="hidden md:inline-flex">Sign up</Button>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="md:hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                variant="ghost"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
              </Button>
            </motion.div>
          </div>
        </div>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.nav
              className="md:hidden bg-background border-t"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="container py-4 space-y-2">
                {['Features', 'Demo', 'Testimonials', 'Pricing'].map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Link href={`#${item.toLowerCase()}`} className="block py-2 hover:text-primary transition-colors">
                      {item}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button variant="outline" className="w-full mt-2">Log in</Button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button className="w-full mt-2">Sign up</Button>
                </motion.div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="flex-1">
        <motion.section
          ref={heroRef}
          className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background to-muted overflow-hidden"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <motion.div
            className="absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          </motion.div>
          <motion.div
            className="absolute -top-20 -left-20 w-60 h-60 bg-primary/20 rounded-full filter blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0,

 50, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className="absolute -bottom-20 -right-20 w-60 h-60 bg-secondary/20 rounded-full filter blur-3xl"
            animate={{
              x: [0, -100, 0],
              y: [0, -50, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
          <div className="container relative z-10 px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-foreground"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Your AI Companion for Mental Wellness
              </motion.h1>
              <motion.p
                className="mx-auto max-w-[700px] text-muted-foreground text-sm sm:text-base md:text-lg lg:text-xl mt-4"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Serenity uses advanced AI to provide empathetic support, helping students navigate their emotional challenges and improve mental well-being.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Button size="lg" className="mt-6 group relative overflow-hidden">
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                  <motion.span className="relative z-10 flex items-center">
                    Get Started
                    <motion.span
                      initial={{ x: 0 }}
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </motion.span>
                  </motion.span>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-center mb-8 md:mb-12"
              variants={fadeInUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              Empowering Features
            </motion.h2>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
              variants={staggerChildrenVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                { icon: MessageCircle, title: "24/7 Support", description: "Always available to listen and provide support, anytime you need it." },
                { icon: Heart, title: "Empathetic Conversations", description: "Engage in meaningful dialogues with an AI that understands and responds to your emotions." },
                { icon: Shield, title: "Privacy Focused", description: "Your conversations are confidential and secure, prioritizing your privacy." },
                { icon: Star, title: "Personalized Guidance", description: "Receive tailored advice and coping strategies based on your unique situation." },
                { icon: Users, title: "Peer Support Network", description: "Connect with others facing similar challenges in moderate group sessions." },
                { icon: Zap, title: "Rapid Response", description: "Get immediate support during critical moments with our quick-response system." },
                { icon: Sparkles, title: "Mood Tracking", description: "Monitor your emotional well-being over time with intuitive mood tracking tools." },
                { icon: Lightbulb, title: "Skill Building", description: "Learn and practice essential mental health skills through interactive exercises." },
                { icon: Smile, title: "Positive Reinforcement", description: "Celebrate your progress and achievements with encouraging feedback." }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl bg-background group"
                  variants={fadeInUpVariants}
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary-foreground/20"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <div className="relative p-6">
                    <motion.div 
                      className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300"
                      animate={floatingAnimation}
                    >
                      <feature.icon className="h-6 w-6 text-primary" />
                    </motion.div>
                    <motion.h3 
                      className="text-lg sm:text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300"
                      initial={{ y: 20, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {feature.title}
                    </motion.h3>
                    <motion.p 
                      className="text-sm sm:text-base text-muted-foreground"
                      initial={{ y: 20, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {feature.description}
                    </motion.p>
                  </div>
                  <motion.div 
                    className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-foreground"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="demo" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-center mb-8 md:mb-12"
              variants={fadeInUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              Experience Serenity
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <ChatInterface />
            </motion.div>
          </div>
        </section>

        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-center mb-8 md:mb-12"
              variants={fadeInUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              What Students Say
            </motion.h2>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
              variants={staggerChildrenVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                { content: "Serenity has been a lifesaver during my exams. It's like having a supportive friend available 24/7.", author: "Sarah", age: 20, image: "https://i.pravatar.cc/150?img=1" },
                { content: "I was skeptical at first, but the AI's empathy and insights have genuinely helped me manage my anxiety.", author: "Mike", age: 22, image: "https://i.pravatar.cc/150?img=2" },
                { content: "As an international student, Serenity has been crucial in helping me navigate cultural differences and homesickness.", author: "Yuki", age: 19, image: "https://i.pravatar.cc/150?img=3" },
                { content: "The personalized coping strategies have made a huge difference in how I handle stress. It's like having a pocket therapist!", author: "Alex", age: 21, image: "https://i.pravatar.cc/150?img=4" },
                { content: "Serenity's ability to understand context and provide relevant advice is impressive. It's more than just a chatbot.", author: "Priya", age: 23, image: "https://i.pravatar.cc/150?img=5" },
                { content: "The peer support feature connected me with others facing similar challenges. It's comforting to know I'm not alone.", author: "Jordan", age: 18, image: "https://i.pravatar.cc/150?img=6" },
                { content: "I love how Serenity helps me track my mood over time. It's really eye-opening to see my emotional patterns.", author: "Emma", age: 20, image: "https://i.pravatar.cc/150?img=7" },
                { content: "The skill-building exercises have given me practical tools to manage my emotions better. I feel more in control now.", author: "Liam", age: 22, image: "https://i.pravatar.cc/150?img=8" },
                { content: "Serenity's positive reinforcement keeps me motivated. It's like having a cheerleader in my pocket!", author: "Zoe", age: 19, image: "https://i.pravatar.cc/150?img=9" }
              ].map((testimonial, index) => (
                <motion.div
                  key={index}
                  className="relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl bg-background group"
                  variants={fadeInUpVariants}
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div 
                    className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-foreground"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <div className="p-6">
                    <motion.div
                      initial={{ rotate: 0 }}
                      whileHover={{ rotate: 12 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Quote className="h-8 w-8 text-primary mb-4" />
                    </motion.div>
                    <motion.p 
                      className="text-sm sm:text-base text-muted-foreground mb-4"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {testimonial.content}
                    </motion.p>
                    <motion.div 
                      className="flex items-center"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={testimonial.image} alt={testimonial.author} />
                        <AvatarFallback>{testimonial.author[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors duration-300">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">Age {testimonial.age}</p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-center mb-8 md:mb-12"
              variants={fadeInUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              Choose Your Plan
            </motion.h2>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={staggerChildrenVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                { name: "Basic", price: "Free", features: ["24/7 AI Support", "Personalized Guidance", "Daily Check-ins", "Mood Tracking", "Basic Skill Building"] },
                { name: "Pro", price: "$9.99/month", features: ["All Basic features", "Peer Support Network", "Advanced Analytics", "Priority Response", "Customized Wellness Plan", "Extended Skill Building Library"] },
                { name: "Premium", price: "$19.99/month", features: ["All Pro features", "Human Therapist Consultations", "Customized Wellness Plan", "Family Account (up to 5 members)", "Emergency Support", "Exclusive Workshops and Webinars"] }
              ].map((plan, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col p-6 bg-background rounded-lg shadow-lg border border-primary relative overflow-hidden group"
                  variants={fadeInUpVariants}
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div 
                    className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-foreground"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.h3 
                    className="text-xl sm:text-2xl font-bold mb-2 group-hover:text-primary transition-colors duration-300"
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {plan.name}
                  </motion.h3>
                  <motion.p 
                    className="text-2xl sm:text-3xl font-bold mb-4"
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {plan.price}
                  </motion.p>
                  <ul className="mb-6 space-y-2 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <motion.li 
                        key={idx} 
                        className="flex items-center text-sm sm:text-base"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="w-full mt-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      Choose Plan
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </motion.span>
                    </Button>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <motion.section
          className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-t from-background to-muted"
          variants={fadeInUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <motion.h2 
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Ready to Prioritize Your Mental Health?
              </motion.h2>
              <motion.p 
                className="mx-auto max-w-[700px] text-muted-foreground text-sm sm:text-base md:text-lg"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Join thousands of students who have found support and guidance with Serenity.
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button size="lg" className="mt-6 group relative overflow-hidden">
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                  <motion.span className="relative z-10 flex items-center">
                    Start Your Journey
                    <motion.span
                      initial={{ x: 0 }}
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </motion.span>
                  </motion.span>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </main>

      <motion.footer 
        className="w-full py-6 bg-muted"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <div className="container px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <motion.div 
              className="flex items-center space-x-2"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Brain className="h-6 w-6" />
              <span className="font-bold">Serenity</span>
            </motion.div>
            <motion.nav 
              className="flex flex-wrap justify-center gap-4 sm:gap-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {['Terms of Service', 'Privacy Policy', 'Contact Us'].map((item) => (
                <motion.div
                  key={item}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link className="text-sm hover:underline underline-offset-4 hover:text-primary transition-colors duration-300" href="https://www.shivanshjasathi.co/">
                    {item}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
          </div>
        </div>
      </motion.footer>

      <motion.div
        className="fixed w-6 h-6 bg-primary rounded-full pointer-events-none z-50 mix-blend-difference"
        style={{ x, y }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </div>
  )
}
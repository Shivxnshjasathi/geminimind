'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Brain, MessageCircle, Heart, Shield, Send, Menu, X, Star, Users, Zap, Check, Quote, Info, Loader2, ArrowRight, Sparkles, Lightbulb, Smile, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

const MODEL_NAME = "gemini-1.0-pro"
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string

const FIXED_PROMPT = `
You are a supportive and empathetic AI assistant designed to provide mental health support and help users build emotional resilience. Your responses should be caring, non-judgmental, and aimed at promoting emotional well-being. In addition to providing emotional support, you actively track and analyze the user's mood patterns, offering personalized emotional resilience plans and adaptive coping strategies. You provide preemptive recommendations based on emotional triggers and suggest progressive emotional growth challenges to help users strengthen their mental health over time.
You offer real-time coping strategies in moments of distress and provide positive reflection through automated journaling. You collaborate with the user to create mental health action plans and adapt your guidance based on what works best for them. Always remind the user that you are an AI, encourage self-care, and suggest professional help when needed.
`

function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm GeminiMind, your AI companion. How can I support you today?" }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
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
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
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

  return (
    <motion.div 
      className="flex flex-col h-[600px] max-w-2xl mx-auto bg-background rounded-xl shadow-xl overflow-hidden border border-primary/20"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between p-4 border-b bg-muted">
        <div className="flex items-center space-x-2">
          <Avatar>
            <AvatarImage src="/placeholder.svg?height=40&width=40" alt="GeminiMind" />
            <AvatarFallback><Brain className="h-6 w-6" /></AvatarFallback>
          </Avatar>
          <span className="font-semibold text-lg">GeminiMind</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-5 w-5" />
                <span className="sr-only">AI Information</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>GeminiMind is an AI assistant designed to provide mental health support.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                <p className="text-sm">{message.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[80%] p-3 rounded-lg bg-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isTyping}>
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </form>
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

  return (
    <div className={`flex flex-col min-h-screen bg-background ${theme === 'dark' ? 'dark' : ''}`}>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4 md:px-6">
          <Link className="flex items-center space-x-2" href="/">
            <Brain className="h-6 w-6" />
            <span className="font-bold text-lg md:text-xl">GeminiMind</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
            <Link href="#demo" className="hover:text-primary transition-colors">Demo</Link>
            <Link href="#testimonials" className="hover:text-primary transition-colors">Testimonials</Link>
            <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="hidden md:inline-flex">Log in</Button>
            <Button className="hidden md:inline-flex">Sign up</Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
            </Button>
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
                <Link href="#features" className="block py-2 hover:text-primary transition-colors">Features</Link>
                <Link href="#demo" className="block py-2 hover:text-primary transition-colors">Demo</Link>
                <Link href="#testimonials" className="block py-2 hover:text-primary transition-colors">Testimonials</Link>
                <Link href="#pricing" className="block py-2 hover:text-primary transition-colors">Pricing</Link>
                <Button variant="outline" className="w-full mt-2">Log in</Button>
                <Button className="w-full mt-2">Sign up</Button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

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
              y: [0, 50, 0],
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
                GeminiMind uses advanced AI to provide empathetic support, helping students navigate their emotional challenges and improve mental well-being.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Button size="lg" className="mt-6 group">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-center mb-8 md:mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              Empowering Features
            </motion.h2>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6">
                    <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-foreground transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="demo" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-center mb-8 md:mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              Experience GeminiMind
            </motion.h2>
            <ChatInterface />
          </div>
        </section>

        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-center mb-8 md:mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              What Students Say
            </motion.h2>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
              viewport={{ once: true }}
            >
              {[
                { content: "GeminiMind has been a lifesaver during my exams. It's like having a supportive friend available 24/7.", author: "Sarah", age: 20, image: "https://i.pravatar.cc/150?img=1" },
                { content: "I was skeptical at first, but the AI's empathy and insights have genuinely helped me manage my anxiety.", author: "Mike", age: 22, image: "https://i.pravatar.cc/150?img=2" },
                { content: "As an international student, GeminiMind has been crucial in helping me navigate cultural differences and homesickness.", author: "Yuki", age: 19, image: "https://i.pravatar.cc/150?img=3" },
                { content: "The personalized coping strategies have made a huge difference in how I handle stress. It's like having a pocket therapist!", author: "Alex", age: 21, image: "https://i.pravatar.cc/150?img=4" },
                { content: "GeminiMind's ability to understand context and provide relevant advice is impressive. It's more than just a chatbot.", author: "Priya", age: 23, image: "https://i.pravatar.cc/150?img=5" },
                { content: "The peer support feature connected me with others facing similar challenges. It's comforting to know I'm not alone.", author: "Jordan", age: 18, image: "https://i.pravatar.cc/150?img=6" },
                { content: "I love how GeminiMind helps me track my mood over time. It's really eye-opening to see my emotional patterns.", author: "Emma", age: 20, image: "https://i.pravatar.cc/150?img=7" },
                { content: "The skill-building exercises have given me practical tools to manage my emotions better. I feel more in control now.", author: "Liam", age: 22, image: "https://i.pravatar.cc/150?img=8" },
                { content: "GeminiMind's positive reinforcement keeps me motivated. It's like having a cheerleader in my pocket!", author: "Zoe", age: 19, image: "https://i.pravatar.cc/150?img=9" }
              ].map((testimonial, index) => (
                <motion.div
                  key={index}
                  className="relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl bg-background group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-foreground transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="p-6">
                    <Quote className="h-8 w-8 text-primary mb-4 transform group-hover:rotate-12 transition-transform duration-300" />
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">{testimonial.content}</p>
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={testimonial.image} alt={testimonial.author} />
                        <AvatarFallback>{testimonial.author[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors duration-300">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">Age {testimonial.age}</p>
                      </div>
                    </div>
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
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              Choose Your Plan
            </motion.h2>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-foreground transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">{plan.name}</h3>
                  <p className="text-2xl sm:text-3xl font-bold mb-4">{plan.price}</p>
                  <ul className="mb-6 space-y-2 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm sm:text-base">
                        <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    Choose Plan
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <motion.section
          className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-t from-background to-muted"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter">
                Ready to Prioritize Your Mental Health?
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground text-sm sm:text-base md:text-lg">
                Join thousands of students who have found support and guidance with GeminiMind.
              </p>
              <Button size="lg" className="mt-6 group">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="w-full py-6 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6" />
              <span className="font-bold">GeminiMind</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <Link className="text-sm hover:underline underline-offset-4 hover:text-primary transition-colors duration-300" href="#">
                Terms of Service
              </Link>
              <Link className="text-sm hover:underline underline-offset-4 hover:text-primary transition-colors duration-300" href="#">
                Privacy Policy
              </Link>
              <Link className="text-sm hover:underline underline-offset-4 hover:text-primary transition-colors duration-300" href="#">
                Contact Us
              </Link>
            </nav>
          </div>
        </div>
      </footer>

      <motion.div
        className="fixed w-6 h-6 bg-primary rounded-full pointer-events-none z-50"
        style={{ x, y }}
      />
    </div>
  )
}

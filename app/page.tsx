"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, Square, Save, FolderOpen, Volume2, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface Recipe {
  id: string
  title: string
  content: string
  createdAt: string
}

interface TTSSettings {
  rate: number
  pitch: number
  volume: number
  voice: string
}

export default function RecipeTTSApp() {
  const [recipe, setRecipe] = useState("")
  const [recipeTitle, setRecipeTitle] = useState("")
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>({
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: "",
  })
  const { toast } = useToast()

  // Load saved recipes and TTS settings on component mount
  useEffect(() => {
    const saved = localStorage.getItem("savedRecipes")
    if (saved) {
      setSavedRecipes(JSON.parse(saved))
    }

    const savedSettings = localStorage.getItem("ttsSettings")
    if (savedSettings) {
      setTTSSettings(JSON.parse(savedSettings))
    }

    // Load available voices
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      setAvailableVoices(voices)
      if (voices.length > 0 && !ttsSettings.voice) {
        setTTSSettings((prev) => ({ ...prev, voice: voices[0].name }))
      }
    }

    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  // Save TTS settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("ttsSettings", JSON.stringify(ttsSettings))
  }, [ttsSettings])

  const saveRecipe = () => {
    if (!recipeTitle.trim() || !recipe.trim()) {
      toast({
        title: "Error",
        description: "Please enter both a title and recipe content",
        variant: "destructive",
      })
      return
    }

    const newRecipe: Recipe = {
      id: Date.now().toString(),
      title: recipeTitle,
      content: recipe,
      createdAt: new Date().toISOString(),
    }

    const updatedRecipes = [...savedRecipes, newRecipe]
    setSavedRecipes(updatedRecipes)
    localStorage.setItem("savedRecipes", JSON.stringify(updatedRecipes))

    toast({
      title: "Success",
      description: "Recipe saved successfully!",
    })
  }

  const loadRecipe = (selectedRecipe: Recipe) => {
    setRecipeTitle(selectedRecipe.title)
    setRecipe(selectedRecipe.content)
    toast({
      title: "Recipe Loaded",
      description: `Loaded "${selectedRecipe.title}"`,
    })
  }

  const deleteRecipe = (id: string) => {
    const updatedRecipes = savedRecipes.filter((r) => r.id !== id)
    setSavedRecipes(updatedRecipes)
    localStorage.setItem("savedRecipes", JSON.stringify(updatedRecipes))
    toast({
      title: "Recipe Deleted",
      description: "Recipe has been removed",
    })
  }

  const startSpeech = () => {
    if (!recipe.trim()) {
      toast({
        title: "No Content",
        description: "Please enter a recipe to read aloud",
        variant: "destructive",
      })
      return
    }

    if (isPaused && currentUtterance) {
      speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }

    // Stop any current speech
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(recipe)

    // Apply TTS settings
    utterance.rate = ttsSettings.rate
    utterance.pitch = ttsSettings.pitch
    utterance.volume = ttsSettings.volume

    // Set voice if available
    const selectedVoice = availableVoices.find((voice) => voice.name === ttsSettings.voice)
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentUtterance(null)
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentUtterance(null)
      toast({
        title: "Speech Error",
        description: "An error occurred during speech synthesis",
        variant: "destructive",
      })
    }

    setCurrentUtterance(utterance)
    speechSynthesis.speak(utterance)
  }

  const pauseSpeech = () => {
    if (isPlaying) {
      speechSynthesis.pause()
      setIsPlaying(false)
      setIsPaused(true)
    }
  }

  const stopSpeech = () => {
    speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentUtterance(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Recipe Reader</h1>
          <p className="text-gray-600">Listen to your recipes with text-to-speech</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recipe Input */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Recipe Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="recipe-title">Recipe Title</Label>
                  <Input
                    id="recipe-title"
                    placeholder="Enter recipe title..."
                    value={recipeTitle}
                    onChange={(e) => setRecipeTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="recipe-content">Recipe Content</Label>
                  <Textarea
                    id="recipe-content"
                    placeholder="Paste or type your recipe here..."
                    value={recipe}
                    onChange={(e) => setRecipe(e.target.value)}
                    className="mt-1 min-h-[300px] resize-none"
                    aria-label="Recipe content input"
                  />
                </div>

                {/* Speech Controls */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    onClick={startSpeech}
                    disabled={isPlaying}
                    className="flex items-center gap-2"
                    aria-label={isPaused ? "Resume reading" : "Start reading"}
                  >
                    <Play className="w-4 h-4" />
                    {isPaused ? "Resume" : "Start Reading"}
                  </Button>

                  <Button
                    onClick={pauseSpeech}
                    disabled={!isPlaying}
                    variant="outline"
                    className="flex items-center gap-2"
                    aria-label="Pause reading"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>

                  <Button
                    onClick={stopSpeech}
                    disabled={!isPlaying && !isPaused}
                    variant="outline"
                    className="flex items-center gap-2"
                    aria-label="Stop reading"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </Button>

                  <Button
                    onClick={() => setShowSettings(!showSettings)}
                    variant="outline"
                    className="flex items-center gap-2 ml-auto"
                    aria-label="Toggle speech settings"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                </div>

                {/* TTS Settings */}
                {showSettings && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Speech Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Speech Rate: {ttsSettings.rate.toFixed(1)}x</Label>
                        <Slider
                          value={[ttsSettings.rate]}
                          onValueChange={(value) => setTTSSettings((prev) => ({ ...prev, rate: value[0] }))}
                          min={0.5}
                          max={2}
                          step={0.1}
                          className="mt-2"
                          aria-label="Speech rate"
                        />
                      </div>

                      <div>
                        <Label>Pitch: {ttsSettings.pitch.toFixed(1)}</Label>
                        <Slider
                          value={[ttsSettings.pitch]}
                          onValueChange={(value) => setTTSSettings((prev) => ({ ...prev, pitch: value[0] }))}
                          min={0.5}
                          max={2}
                          step={0.1}
                          className="mt-2"
                          aria-label="Speech pitch"
                        />
                      </div>

                      <div>
                        <Label>Volume: {Math.round(ttsSettings.volume * 100)}%</Label>
                        <Slider
                          value={[ttsSettings.volume]}
                          onValueChange={(value) => setTTSSettings((prev) => ({ ...prev, volume: value[0] }))}
                          min={0}
                          max={1}
                          step={0.1}
                          className="mt-2"
                          aria-label="Speech volume"
                        />
                      </div>

                      {availableVoices.length > 0 && (
                        <div>
                          <Label>Voice</Label>
                          <Select
                            value={ttsSettings.voice}
                            onValueChange={(value) => setTTSSettings((prev) => ({ ...prev, voice: value }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select a voice" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableVoices.map((voice) => (
                                <SelectItem key={voice.name} value={voice.name}>
                                  {voice.name} ({voice.lang})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Saved Recipes */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Recipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={saveRecipe} className="w-full" disabled={!recipeTitle.trim() || !recipe.trim()}>
                  Save Current Recipe
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  Saved Recipes ({savedRecipes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedRecipes.length === 0 ? (
                  <p className="text-gray-500 text-sm">No saved recipes yet</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {savedRecipes.map((savedRecipe) => (
                      <div key={savedRecipe.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <h4 className="font-medium text-sm mb-1">{savedRecipe.title}</h4>
                        <p className="text-xs text-gray-500 mb-2">
                          {new Date(savedRecipe.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadRecipe(savedRecipe)}
                            className="text-xs"
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRecipe(savedRecipe.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Indicator */}
        {(isPlaying || isPaused) && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-green-700">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
                <span className="text-sm font-medium">{isPlaying ? "Reading recipe..." : "Reading paused"}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Toaster />
    </div>
  )
}

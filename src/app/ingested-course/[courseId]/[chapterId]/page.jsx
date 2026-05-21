"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Loader2,
    Clock,
    ChevronUp,
    List,
    Sparkles,
    Lightbulb,
    HelpCircle,
    CheckCircle2,
    XCircle,
    RotateCcw
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import BookmarkButton from "@/components/chapter_content/BookmarkButton";
import ChatBot from "@/components/chat/ChatBot";
import MarkDown from "@/components/MarkDown";

export default function IngestedChapterPage() {
    const params = useParams();
    const router = useRouter();
    const { user, getToken } = useAuth();

    // Data States
    const [chapter, setChapter] = useState(null);
    const [courseTitle, setCourseTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [readProgress, setReadProgress] = useState(0);
    const contentRef = useRef(null);

    // AI Feature States
    const [aiSummary, setAiSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    const [aiTips, setAiTips] = useState(null);
    const [loadingTips, setLoadingTips] = useState(false);

    const [quiz, setQuiz] = useState(null);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState({}); // { [questionIndex]: selectedOptionIndex }
    const [quizSubmitted, setQuizSubmitted] = useState(false);

    const [aiError, setAiError] = useState(null);
    const [chapterCompleted, setChapterCompleted] = useState(false);
    const [progressLoading, setProgressLoading] = useState(false);

    // Safety check to prevent infinite saving loops or re-saving after manual toggle
    const autoSaveAttempted = useRef(false);

    const markChapterCompleted = useCallback(async (completed = true) => {
        if (!user || !chapter) return;

        // If we are performing an action (save or unsave), we consider the "auto-save" opportunity consumed
        // so that scrolling doesn't interfere with user intent.
        autoSaveAttempted.current = true;

        setProgressLoading(true);
        try {
            const token = await getToken();
            const res = await fetch(
                `/api/ingested-courses/${params.courseId}/progress`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        chapterNumber: chapter.chapterNumber,
                        completed,
                    }),
                }
            );

            if (res.ok) {
                setChapterCompleted(completed);
            }
        } catch (error) {
            console.error("Failed to update progress:", error);
        } finally {
            setProgressLoading(false);
        }
    }, [user, chapter, params.courseId, getToken]);

    useEffect(() => {
        fetchChapter();
    }, [params.courseId, params.chapterId]);

    useEffect(() => {
        const handleScroll = () => {
            if (!contentRef.current) return;
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (docHeight > 0) {
                const progress = Math.min(100, Math.round((scrollTop / docHeight) * 100));
                setReadProgress(progress);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Auto-complete when scrolled to bottom
    useEffect(() => {
        // Only auto-save if we haven't attempted yet and chapter is not already complete
        if (readProgress >= 90 && !chapterCompleted && user && chapter && !autoSaveAttempted.current) {
            markChapterCompleted(true);
        }
    }, [readProgress, chapterCompleted, user, chapter, markChapterCompleted]);

    const fetchChapter = async () => {
        setLoading(true);
        // Reset ALL states for the new chapter immediately to prevent race conditions
        setChapter(null);
        setChapterCompleted(false);
        setReadProgress(0);
        autoSaveAttempted.current = false;

        try {
            const res = await fetch(
                `/api/ingested-courses/${params.courseId}/chapters/${params.chapterId}`
            );
            if (res.ok) {
                const data = await res.json();
                setChapter(data.chapter);
                setCourseTitle(data.courseTitle || "");
                // Reset AI Text states on chapter change
                setAiSummary(null);
                setAiTips(null);
                setQuiz(null);
                setQuizAnswers({});
                setQuizSubmitted(false);
                setAiError(null);
            } else {
                setError("Chapter not found");
            }
        } catch (err) {
            setError("Failed to load chapter");
        }
        setLoading(false);
    };

    const generateAIContent = async (type) => {
        const contentText = typeof chapter?.content === "string" ? chapter.content : String(chapter?.content ?? "");
        if (!contentText.trim()) return;

        let setLoadingFn;
        let setContentFn;

        switch (type) {
            case "summary":
                setLoadingFn = setLoadingSummary;
                setContentFn = setAiSummary;
                break;
            case "tips":
                setLoadingFn = setLoadingTips;
                setContentFn = setAiTips;
                break;
            case "quiz":
                setLoadingFn = setLoadingQuiz;
                setContentFn = setQuiz;
                break;
            default:
                return;
        }

        setAiError(null);
        setLoadingFn(true);
        try {
            const res = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, content: contentText }),
            });

            const data = await res.json();

            if (!res.ok) {
                const message = data?.error || data?.details || `Generation failed (${res.status})`;
                setAiError(message);
                return;
            }
            if (data.error) {
                setAiError(data.error);
                return;
            }
            if (data.result != null) {
                setContentFn(data.result);
            }
        } catch (error) {
            console.error(`Failed to generate ${type}:`, error);
            setAiError(error?.message || "Network error. Please try again.");
        } finally {
            setLoadingFn(false);
        }
    };

    const handleQuizOptionSelect = (qIndex, optionIndex) => {
        if (quizSubmitted) return;
        setQuizAnswers(prev => ({
            ...prev,
            [qIndex]: optionIndex
        }));
    };

    const submitQuiz = () => {
        setQuizSubmitted(true);
    };

    const resetQuiz = () => {
        setQuizAnswers({});
        setQuizSubmitted(false);
    };

    // Fetch progress on mount
    useEffect(() => {
        if (!user || !params.courseId) return;

        const fetchProgress = async () => {
            try {
                const token = await getToken();
                const res = await fetch(
                    `/api/ingested-courses/${params.courseId}/progress`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (chapter && data.completedChapters) {
                        const isDone = data.completedChapters.some(num => Number(num) === Number(chapter.chapterNumber));
                        setChapterCompleted(isDone);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch progress:", error);
            }
        };

        if (chapter) {
            fetchProgress();
        }
    }, [user, params.courseId, chapter]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading chapter...</p>
                </div>
            </div>
        );
    }

    if (error || !chapter) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground mb-4">{error || "Chapter not found"}</p>
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/ingested-course/${params.courseId}`)}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Course
                    </Button>
                </div>
            </div>
        );
    }

    const estimatedReadTime = Math.ceil((chapter.wordCount || 0) / 200);

    return (
        <div className="min-h-screen bg-background" ref={contentRef}>
            {/* Reading Progress Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
                <div
                    className="h-full bg-linear-to-r from-purple-500 to-blue-500 transition-all duration-150"
                    style={{ width: `${readProgress}%` }}
                />
            </div>

            {/* Top Navigation */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                router.push(`/ingested-course/${params.courseId}`)
                            }
                            className="shrink-0"
                        >
                            <List className="h-4 w-4 mr-1" />
                            All Chapters
                        </Button>
                        <span className="text-sm text-muted-foreground truncate hidden sm:block">
                            {courseTitle}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {user && (
                            <BookmarkButton
                                courseId={params.courseId}
                                chapterNumber={chapter?.chapterNumber}
                                chapterTitle={chapter?.title}
                                courseTitle={courseTitle}
                                courseType="ingested"
                                size="sm"
                                chapterId={params.chapterId}
                            />
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {estimatedReadTime} min read
                            {chapterCompleted && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" title="Chapter completed" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chapter Content */}
            <div className="max-w-4xl mx-auto px-6 py-10">
                {/* Chapter Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 font-semibold mb-4 tracking-wider uppercase">
                        <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-xs font-bold border border-purple-500/20 shadow-sm">
                            {chapter.chapterNumber}
                        </span>
                        Chapter {chapter.chapterNumber}
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold leading-[1.15] tracking-tight mb-6 bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {chapter.title}
                    </h1>

                    {/* Native Summary */}
                    {chapter.summary && (
                        <p className="mt-4 text-xl text-muted-foreground/80 leading-relaxed font-medium max-w-3xl">
                            {chapter.summary}
                        </p>
                    )}

                    {/* AI Generated Summary Section */}
                    <div className="mt-8">
                        {!aiSummary ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateAIContent('summary')}
                                disabled={loadingSummary}
                                className="group h-10 px-5 border-purple-500/30 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/10 rounded-full transition-all duration-300"
                            >
                                {loadingSummary ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                                )}
                                Generate Deep Summary
                            </Button>
                        ) : (
                            <div className="bg-linear-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 rounded-2xl p-8 mt-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-purple-600 dark:text-purple-400 mb-4 tracking-tight">
                                    <Sparkles className="h-5 w-5 fill-purple-500/20" />
                                    AI Deep Summary
                                </h3>
                                <p className="text-base leading-relaxed text-muted-foreground/90 font-medium">
                                    {aiSummary}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" />
                            {chapter.wordCount?.toLocaleString()} words
                        </div>
                        <span className="opacity-30">•</span>
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {estimatedReadTime} min read
                        </div>
                    </div>
                    <div className="h-px w-full bg-linear-to-r from-border/80 via-border/20 to-transparent mt-8" />
                </div>

                {/* Chapter Text */}
                <article className="prose prose-purple dark:prose-invert max-w-none prose-headings:tracking-tight prose-p:text-muted-foreground/90 prose-p:leading-8 prose-p:text-[1.05rem]">
                    <MarkDown content={chapter.content} />
                </article>

                <hr className="my-12 border-border/50" />

                {/* AI Features Section */}
                <div className="space-y-12">
                    {aiError && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {aiError}
                        </div>
                    )}

                    {/* 1. Key Tips */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Lightbulb className="h-6 w-6 text-yellow-500" />
                                Key Takeaways
                            </h2>
                            {!aiTips && (
                                <Button
                                    onClick={() => generateAIContent('tips')}
                                    disabled={loadingTips}
                                    variant="outline"
                                >
                                    {loadingTips ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                                    Load Tips
                                </Button>
                            )}
                        </div>

                        {aiTips && (
                            <div className="bg-linear-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 rounded-2xl p-8 shadow-sm">
                                <ul className="space-y-4">
                                    {aiTips.split('\n').filter(t => t.trim()).map((tip, i) => (
                                        <li key={i} className="flex gap-4 text-foreground/80 group">
                                            <span className="shrink-0 w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center text-sm font-bold border border-yellow-500/20 group-hover:scale-110 transition-transform">
                                                {i + 1}
                                            </span>
                                            <div className="text-base leading-7 font-medium pt-0.5 flex-1">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => <p className="m-0">{children}</p>,
                                                        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                                                    }}
                                                >
                                                    {tip.replace(/^[-•]\s*/, "")}
                                                </ReactMarkdown>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>

                    {/* 2. Interactive Quiz */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <HelpCircle className="h-6 w-6 text-blue-500" />
                                Knowledge Check
                            </h2>
                            {!quiz && (
                                <Button
                                    onClick={() => generateAIContent('quiz')}
                                    disabled={loadingQuiz}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {loadingQuiz ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                                    Generate Quiz
                                </Button>
                            )}
                        </div>

                        {quiz && Array.isArray(quiz) && (
                            <div className="space-y-6">
                                {quiz.map((q, qIndex) => (
                                    <div key={qIndex} className="bg-card border border-border rounded-xl overflow-hidden">
                                        <div className="p-6 bg-linear-to-b from-muted/50 to-muted/20 border-b border-border/50">
                                            <h3 className="font-bold text-xl leading-snug tracking-tight">
                                                {qIndex + 1}. {q.question}
                                            </h3>
                                        </div>
                                        <div className="p-6 space-y-3">
                                            {q.options.map((option, optIndex) => {
                                                const isSelected = quizAnswers[qIndex] === optIndex;
                                                const isCorrect = q.correctAnswer === optIndex;

                                                let className = "w-full justify-start h-auto py-4 px-5 text-left font-medium transition-all duration-200 border-2 rounded-xl group/option";

                                                if (quizSubmitted) {
                                                    if (isCorrect) {
                                                        className += " bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-300 hover:bg-green-500/20";
                                                    } else if (isSelected && !isCorrect) {
                                                        className += " bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-300 hover:bg-red-500/20";
                                                    } else {
                                                        className += " opacity-40 grayscale-[0.5]";
                                                    }
                                                } else {
                                                    if (isSelected) {
                                                        className += " border-blue-500 bg-blue-500/5 text-blue-700 dark:text-blue-300 shadow-md shadow-blue-500/10";
                                                    } else {
                                                        className += " border-border/60 hover:border-primary/40 hover:bg-primary/5";
                                                    }
                                                }

                                                return (
                                                    <Button
                                                        key={optIndex}
                                                        variant="ghost"
                                                        className={className}
                                                        onClick={() => handleQuizOptionSelect(qIndex, optIndex)}
                                                        disabled={quizSubmitted}
                                                    >
                                                        <div className="flex items-center w-full">
                                                            <div className={cn(
                                                                "w-7 h-7 rounded-lg border-2 flex items-center justify-center mr-4 text-xs font-bold transition-colors",
                                                                isSelected || (quizSubmitted && isCorrect)
                                                                    ? "border-current bg-current/10"
                                                                    : "border-muted-foreground/20 group-hover/option:border-primary/40"
                                                            )}>
                                                                {String.fromCharCode(65 + optIndex)}
                                                            </div>
                                                            <span className="flex-1 text-[0.95rem]">{option}</span>
                                                            {quizSubmitted && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-600 ml-2" />}
                                                            {quizSubmitted && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600 ml-2" />}
                                                        </div>
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        {quizSubmitted && q.explanation && (
                                            <div className="px-6 pb-6 pt-0">
                                                <div className="bg-primary/5 rounded-xl p-4 text-[0.9rem] leading-relaxed text-muted-foreground border border-primary/10">
                                                    <span className="font-bold text-primary mr-2 uppercase tracking-wider text-[10px]">Explanation:</span>
                                                    {q.explanation}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="flex justify-end gap-3 pt-4">
                                    {quizSubmitted ? (
                                        <Button onClick={resetQuiz} variant="outline" className="gap-2">
                                            <RotateCcw className="h-4 w-4" /> Try Again
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={submitQuiz}
                                            disabled={Object.keys(quizAnswers).length !== quiz.length}
                                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Submit Answers
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                </div>

                {/* Chapter Completion */}
                {user && (
                    <div className="mt-8 pt-6 border-t border-border/50">
                        <div className="flex items-center justify-center">
                            <Button
                                onClick={() => markChapterCompleted(!chapterCompleted)}
                                disabled={progressLoading}
                                variant={chapterCompleted ? "outline" : "default"}
                                className={chapterCompleted ? "gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/10" : "bg-green-600 hover:bg-green-700 text-white gap-2"}
                            >
                                {progressLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {chapterCompleted ? "Marking as Incomplete..." : "Saving..."}
                                    </>
                                ) : chapterCompleted ? (
                                    <>
                                        <XCircle className="h-4 w-4" />
                                        Mark as Incomplete
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Mark Chapter as Complete
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Chapter Navigation */}
                <div className="mt-12 pt-6 border-t border-border/50">
                    <div className="flex justify-between items-center">
                        <Button
                            variant="outline"
                            onClick={() =>
                                router.push(
                                    `/ingested-course/${params.courseId}/${chapter.previousChapterId}`
                                )
                            }
                            disabled={!chapter.previousChapterId}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span>Previous Chapter</span>
                        </Button>

                        <span className="text-sm text-muted-foreground">
                            Chapter {chapter.chapterNumber}
                            {chapterCompleted && (
                                <span className="ml-2 text-green-500">✓ Completed</span>
                            )}
                        </span>

                        <Button
                            onClick={() =>
                                router.push(
                                    `/ingested-course/${params.courseId}/${chapter.nextChapterId}`
                                )
                            }
                            disabled={!chapter.nextChapterId}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <span>Next Chapter</span>
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <ChatBot
                courseId={params.courseId}
                chapterId={params.chapterId}
                courseTitle={courseTitle}
            />

            {/* Scroll to Top Button */}
            {readProgress > 20 && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/25 flex items-center justify-center hover:bg-purple-600 transition-all z-50"
                >
                    <ChevronUp className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}

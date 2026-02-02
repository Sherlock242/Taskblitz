"use client"

import React, { useState, useTransition, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { getComments, addComment } from "./actions"
import type { Task, Comment, User } from "@/lib/types"
import { MessageSquare, Send } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'

interface CommentsSheetProps {
    task: Task;
    userRole: User['role'];
}

export function CommentsSheet({ task }: CommentsSheetProps) {
    const [open, setOpen] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPosting, startPostingTransition] = useTransition();
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            setIsLoading(true);
            setError(null);
            getComments(task.id)
                .then(result => {
                    if (result.data) {
                        setComments(result.data);
                    } else if (result.error) {
                        setError("Could not load comments.");
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [open, task.id]);

    useEffect(() => {
        // Auto-scroll to bottom when new comments are added
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
        }
    }, [comments]);


    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        startPostingTransition(async () => {
            const result = await addComment(task.id, newComment);
            if (result.error) {
                toast({ title: "Error", description: result.error.message, variant: "destructive" });
            } else {
                setNewComment("");
                // Re-fetch comments to show the new one
                setError(null);
                const updatedComments = await getComments(task.id);
                if (updatedComments.data) {
                    setComments(updatedComments.data);
                } else if (updatedComments.error) {
                    setError("Could not refresh comments.");
                }
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MessageSquare className="h-4 w-4" />
                    <span className="sr-only">Comments</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Comments for "{task.name}"</DialogTitle>
                    <DialogDescription>
                        Discuss the task with your team members.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4 -mr-6" ref={scrollAreaRef}>
                     <div className="space-y-4 py-4">
                        {isLoading ? (
                            <p className="text-sm text-center text-muted-foreground py-8">Loading comments...</p>
                        ) : error ? (
                            <p className="text-sm text-center text-destructive py-8">{error}</p>
                        ) : comments.length > 0 ? (
                            comments.map(comment => (
                                <div key={comment.id} className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.profiles?.avatar_url || undefined} alt={comment.profiles?.name || ''} />
                                        <AvatarFallback>{comment.profiles?.name?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm">{comment.profiles?.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-8">No comments yet.</p>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="mt-auto pt-4 border-t">
                    <form action={handleAddComment} className="flex w-full items-center space-x-2">
                        <Input 
                            id="comment" 
                            placeholder="Write a comment..." 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={isPosting}
                        />
                        <Button type="submit" size="icon" disabled={isPosting || !newComment.trim()}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

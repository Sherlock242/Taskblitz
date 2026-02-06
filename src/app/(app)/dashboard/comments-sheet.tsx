"use client"

import React, { useState, useTransition, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { getAuditTrail, addComment, deleteComment } from "./actions"
import type { Task, AuditTrailItem, User } from "@/lib/types"
import { MessageSquare, Send, Trash2, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'
import { Badge } from "@/components/ui/badge"

interface CommentsSheetProps {
    task: Task;
    userRole: User['role'];
    currentUserId: string;
}

export function CommentsSheet({ task, userRole, currentUserId }: CommentsSheetProps) {
    const [open, setOpen] = useState(false);
    const [activity, setActivity] = useState<AuditTrailItem[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPosting, startPostingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            setIsLoading(true);
            setError(null);
            getAuditTrail(task.id)
                .then(result => {
                    if (result.data) {
                        setActivity(result.data);
                    } else if (result.error) {
                        setError("Could not load activity.");
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
    }, [activity]);


    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        startPostingTransition(async () => {
            const result = await addComment(task.id, newComment);
            if (result.error) {
                toast({ title: "Error", description: result.error.message, variant: "destructive" });
            } else {
                setNewComment("");
                // Re-fetch activity to show the new one
                setError(null);
                const updatedActivity = await getAuditTrail(task.id);
                if (updatedActivity.data) {
                    setActivity(updatedActivity.data);
                } else if (updatedActivity.error) {
                    setError("Could not refresh activity.");
                }
            }
        });
    };

    const handleDeleteComment = async (commentId: string) => {
        startDeletingTransition(async () => {
            const result = await deleteComment(commentId);
            if (result.error) {
                toast({ title: "Error", description: result.error.message, variant: "destructive" });
            } else {
                toast({ title: "Comment Deleted", description: result.data?.message });
                // Re-fetch activity after deletion
                const updatedActivity = await getAuditTrail(task.id);
                if (updatedActivity.data) {
                    setActivity(updatedActivity.data);
                }
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MessageSquare className="h-4 w-4" />
                    <span className="sr-only">Activity</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Activity for "{task.name}"</DialogTitle>
                    <DialogDescription>
                        Comments and status changes for this task.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4 -mr-6" ref={scrollAreaRef}>
                     <div className="space-y-4 py-4">
                        {isLoading ? (
                            <p className="text-sm text-center text-muted-foreground py-8">Loading activity...</p>
                        ) : error ? (
                            <p className="text-sm text-center text-destructive py-8">{error}</p>
                        ) : activity.length > 0 ? (
                            activity.map(item => {
                                if (item.type === 'comment') {
                                    return (
                                        <div key={item.id} className="flex items-start gap-3 group">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={item.profiles?.avatar_url || undefined} alt={item.profiles?.name || ''} />
                                                <AvatarFallback>{item.profiles?.name?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm">{item.profiles?.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-muted-foreground break-words">{item.content}</p>
                                            </div>
                                            {(userRole === 'Admin' || item.user_id === currentUserId) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleDeleteComment(item.id)}
                                                    disabled={isDeleting}
                                                    aria-label="Delete comment"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    )
                                } else { // 'status_change'
                                    return (
                                        <div key={item.id} className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                 <AvatarImage src={item.profiles?.avatar_url || undefined} alt={item.profiles?.name || ''} />
                                                <AvatarFallback>{item.profiles?.name?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 text-sm text-muted-foreground">
                                                <span className="font-semibold text-foreground">{item.profiles?.name || 'System'}</span>
                                                {' changed status from '}
                                                <Badge variant="outline" className="font-medium">{item.previous_status || 'None'}</Badge>
                                                <ArrowRight className="inline-block h-3 w-3 mx-1" />
                                                <Badge variant="outline" className="font-medium">{item.new_status}</Badge>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                }
                            })
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-8">No activity yet.</p>
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

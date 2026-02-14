
"use client"

import React, { useState, useTransition, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { getAuditTrail, addComment, deleteComment } from "./actions"
import type { Task, AuditTrailItem, User } from "@/lib/types"
import { Send, Trash2, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

interface CommentsSheetProps {
    task: Task;
    userRole: User['role'];
    currentUserId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CommentsSheet({ task, userRole, currentUserId, open, onOpenChange }: CommentsSheetProps) {
    const [activity, setActivity] = useState<AuditTrailItem[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPosting, startPostingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const fetchActivity = useCallback(async (showLoadingSpinner = true) => {
        if (!task.id) return;
        if (showLoadingSpinner) setIsLoading(true);
        setError(null);
        const result = await getAuditTrail(task.id);
        if (result.data) {
            setActivity(result.data);
        } else if (result.error) {
            setError(result.error.message);
            toast({ title: "Error", description: `Could not load activity: ${result.error.message}`, variant: "destructive" });
        }
        if (showLoadingSpinner) setIsLoading(false);
    }, [task.id, toast]);


    useEffect(() => {
        if (open) {
            fetchActivity(true);
        }
    }, [open, fetchActivity]);

    // Real-time subscription to refresh activity from OTHER users
    useEffect(() => {
        if (!open || !task.id) return;

        const handleRealtimeUpdate = (payload: any) => {
             // A simple refetch is the most reliable way to handle any change from another user.
            // We check the user_id to avoid refetching for our own actions, which are handled optimistically.
            const recordUserId = payload.new?.user_id || payload.old?.user_id;
            if (recordUserId && recordUserId === currentUserId) {
                return;
            }
            fetchActivity(false);
        };

        const commentsChannel = supabase
            .channel(`comments-for-task-${task.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${task.id}` }, handleRealtimeUpdate)
            .subscribe();
            
        const historyChannel = supabase
            .channel(`history-for-task-${task.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_history', filter: `task_id=eq.${task.id}` }, handleRealtimeUpdate)
            .subscribe();

        return () => {
            supabase.removeChannel(commentsChannel);
            supabase.removeChannel(historyChannel);
        };
    }, [open, task.id, supabase, fetchActivity, currentUserId]);

    useEffect(() => {
        if (scrollAreaRef.current) {
            // A slight delay ensures the new item is rendered before we scroll.
             setTimeout(() => {
                scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
            }, 100);
        }
    }, [activity]);


    const handleAddComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const content = newComment.trim();
        if (!content) return;

        startPostingTransition(async () => {
            const originalComment = newComment;
            setNewComment(""); // Clear input immediately for responsive feel

            const result = await addComment(task.id, content);
            
            if (result.error) {
                toast({ title: "Error", description: result.error.message, variant: "destructive" });
                setNewComment(originalComment); // Restore input on failure
            } else if (result.data) {
                // Instant UI update for the current user
                setActivity(prev => [...prev, result.data]);
            }
        });
    };

    const handleDeleteComment = async (commentId: string) => {
        startDeletingTransition(async () => {
            const result = await deleteComment(commentId);
            if (result.error) {
                toast({ title: "Error", description: result.error.message, variant: "destructive" });
            } else {
                // Instant UI update for the current user
                setActivity(prev => prev.filter(item => item.id !== commentId));
                toast({ title: "Comment Deleted" });
            }
        });
    };

    const handlePointerDownOutside = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-radix-collection-item]') && !document.body.contains(target)) {
            e.preventDefault();
        }
    }


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="sm:max-w-lg max-h-[80vh] flex flex-col"
                onPointerDownOutside={handlePointerDownOutside}
            >
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
                                const profile = item.profiles;
                                const userName = profile?.name || 'Unknown User';
                                const userAvatar = profile?.avatar_url || undefined;
                                const userInitial = userName?.charAt(0) || 'U';

                                if (item.type === 'comment') {
                                    return (
                                        <div key={item.id} className="flex items-start gap-3 group">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={userAvatar} alt={userName} />
                                                <AvatarFallback>{userInitial}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm">{userName}</p>
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
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                                    onClick={() => handleDeleteComment(item.id)}
                                                    disabled={isDeleting}
                                                    aria-label="Delete comment"
                                                    onPointerDown={(e) => e.stopPropagation()} // Prevent dialog from closing
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
                                                 <AvatarImage src={userAvatar} alt={userName} />
                                                <AvatarFallback>{userInitial}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 text-sm text-muted-foreground">
                                                <span className="font-semibold text-foreground">{userName}</span>
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
                    <form onSubmit={handleAddComment} className="flex w-full items-center space-x-2">
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
    );
}

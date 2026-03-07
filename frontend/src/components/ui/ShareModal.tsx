import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Share2, Copy, Send, Mail, Check, Search,
    X, MessageCircle, CheckCircle2, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface ShareData {
    url: string;
    title: string;
    text: string;
    imageUrl?: string; // post thumbnail / logo
}

interface ShareTarget {
    _id: string; // User ID or Conversation ID
    name: string;
    avatar?: string;
    type?: string;
    isGroup?: boolean;
    conversationId?: string;
}

interface ShareModalProps {
    open: boolean;
    onClose: () => void;
    shareData: ShareData | null;
}

const ShareModal: React.FC<ShareModalProps> = ({ open, onClose, shareData }) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const [targets, setTargets] = useState<ShareTarget[]>([]);
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState<Record<string, boolean>>({});
    const [sent, setSent] = useState<Record<string, boolean>>({});

    /* ── Load mutual connections and existing conversations when modal opens ── */
    useEffect(() => {
        if (!open) return;
        const fetchTargets = async () => {
            setLoadingTargets(true);
            try {
                // Fetch mutual connections and existing conversations in parallel
                const [connRes, convRes] = await Promise.all([
                    api.get('/api/follows/connections/accepted'),
                    api.get('/api/conversations')
                ]);

                const mutuals: ShareTarget[] = (connRes.data.connections || []).map((c: any) => {
                    const user = c.requester || c.user || c;
                    return {
                        _id: user._id,
                        name: user.name,
                        avatar: user.avatar,
                        type: user.type,
                        isGroup: false
                    };
                });

                const conversations: ShareTarget[] = (convRes.data.conversations || []).map((conv: any) => {
                    if (conv.isGroupChat) {
                        return {
                            _id: conv._id,
                            name: conv.groupName || 'Unnamed Group',
                            avatar: conv.avatar,
                            type: 'Group',
                            isGroup: true,
                            conversationId: conv._id
                        };
                    } else {
                        const otherParticipant = conv.participants.find((p: any) => p._id !== (api.defaults.headers.common['userId'] as string));
                        if (!otherParticipant) return null;
                        return {
                            _id: otherParticipant._id,
                            name: otherParticipant.name,
                            avatar: otherParticipant.avatar,
                            type: otherParticipant.type,
                            isGroup: false,
                            conversationId: conv._id
                        };
                    }
                }).filter(Boolean);

                // Merge and de-duplicate by User ID or Group ID
                const merged = [...conversations, ...mutuals];
                const seen = new Set();
                const uniqueTargets = merged.filter(t => {
                    const duplicate = seen.has(t._id);
                    seen.add(t._id);
                    return !duplicate;
                });

                setTargets(uniqueTargets);
            } catch (error) {
                console.error('Error fetching targets:', error);
                setTargets([]);
            } finally {
                setLoadingTargets(false);
            }
        };
        fetchTargets();
    }, [open]);

    /* ── Reset state when closed ── */
    useEffect(() => {
        if (!open) {
            setCopied(false);
            setSearch('');
            setSent({});
            setSending({});
        }
    }, [open]);

    const filteredTargets = targets.filter(t =>
        t.name?.toLowerCase().includes(search.toLowerCase())
    );

    /* ── Copy link ── */
    const copyLink = useCallback(async () => {
        if (!shareData) return;
        try {
            await navigator.clipboard.writeText(shareData.url);
            setCopied(true);
            toast({ title: 'Link Copied!', description: 'Shareable link copied to clipboard.' });
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast({ title: 'Failed to copy', variant: 'destructive' });
        }
    }, [shareData, toast]);

    /* ── Send via DM ── */
    const sendToTarget = useCallback(async (target: ShareTarget) => {
        if (!shareData) return;
        setSending(prev => ({ ...prev, [target._id]: true }));

        const msgBody = [
            shareData.text || '',
            shareData.url
        ].filter(Boolean).join('\n');

        try {
            let conversationId = target.conversationId;

            // 1. Get or create a conversation if we don't have an ID yet (for mutuals we haven't texted)
            if (!conversationId) {
                const convRes = await api.post('/api/conversations', { participantId: target._id });
                conversationId = convRes.data.conversation._id;
            }

            // 2. Post the message
            await api.post(`/api/conversations/${conversationId}/messages`, {
                content: msgBody,
                messageType: 'text'
            });

            setSent(prev => ({ ...prev, [target._id]: true }));
            toast({ title: 'Sent! ✓', description: `Post shared with ${target.name}.` });
        } catch (err: any) {
            toast({
                title: 'Could not send',
                description: err?.response?.data?.error || 'Try again later.',
                variant: 'destructive'
            });
        } finally {
            setSending(prev => ({ ...prev, [target._id]: false }));
        }
    }, [shareData, toast]);

    if (!shareData) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white dark:bg-gray-900">

                {/* ── Header gradient ── */}
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 pt-6 pb-8 text-white relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-lg" />

                    <div className="relative flex items-start gap-4">
                        {shareData.imageUrl ? (
                            <img
                                src={shareData.imageUrl}
                                alt="Post"
                                className="w-14 h-14 rounded-xl object-cover border-2 border-white/30 shadow-lg flex-shrink-0"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 border-2 border-white/30">
                                <Share2 className="h-7 w-7" />
                            </div>
                        )}

                        <div className="flex-1 min-w-0 pr-6">
                            <DialogTitle className="text-lg font-bold leading-tight mb-0.5">Share Post</DialogTitle>
                            <p className="text-white/75 text-xs leading-snug line-clamp-2">{shareData.text}</p>
                        </div>
                    </div>
                </div>

                <div className="px-5 pb-5 pt-4 space-y-5">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Share via</p>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + '\n' + shareData.url)}`, '_blank')}
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
                            >
                                <div className="w-11 h-11 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <Send className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">WhatsApp</span>
                            </button>

                            <button
                                onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`, '_blank')}
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                            >
                                <div className="w-11 h-11 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <Share2 className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">LinkedIn</span>
                            </button>

                            <button
                                onClick={() => window.open(`mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text + '\n\n' + shareData.url)}`, '_blank')}
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group"
                            >
                                <div className="w-11 h-11 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Email</span>
                            </button>

                            <button
                                onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`, '_blank')}
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                            >
                                <div className="w-11 h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <span className="font-bold text-sm">𝕏</span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Twitter</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Shareable Link</p>
                        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                            <input
                                readOnly
                                value={shareData.url}
                                className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-slate-100 focus:ring-0 px-2 truncate outline-none w-full"
                            />
                            <Button
                                size="sm"
                                onClick={copyLink}
                                className={`shrink-0 h-8 px-3 transition-all duration-300 ${copied ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                        </div>
                    </div>

                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Send to Connection or Group</p>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search connections or groups..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8 h-9 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                            />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                            {loadingTargets ? (
                                <div className="flex items-center justify-center py-6 text-slate-400">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span className="text-sm">Loading...</span>
                                </div>
                            ) : filteredTargets.length === 0 ? (
                                <div className="text-center py-6">
                                    <MessageCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">No results found</p>
                                </div>
                            ) : (
                                filteredTargets.map(target => (
                                    <div
                                        key={target._id}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                                    >
                                        <Avatar className="h-9 w-9 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                                            <AvatarImage src={target.avatar} />
                                            <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                                                {target.name?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                {target.name}
                                            </p>
                                            {target.type && (
                                                <Badge variant={target.isGroup ? "default" : "outline"} className={`text-[9px] py-0 px-1 h-4 capitalize ${target.isGroup ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-none' : ''}`}>
                                                    {target.type}
                                                </Badge>
                                            )}
                                        </div>

                                        <Button
                                            size="sm"
                                            variant={sent[target._id] ? 'outline' : 'default'}
                                            onClick={() => !sent[target._id] && sendToTarget(target)}
                                            disabled={!!sending[target._id] || !!sent[target._id]}
                                            className={`h-8 px-3 text-xs shrink-0 transition-all ${sent[target._id]
                                                ? 'border-green-400 text-green-600 dark:text-green-400'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                }`}
                                        >
                                            {sending[target._id] ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : sent[target._id] ? (
                                                <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Sent</>
                                            ) : (
                                                <><Send className="h-3.5 w-3.5 mr-1" />Send</>
                                            )}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShareModal;

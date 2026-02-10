import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}

interface ProjectChatProps {
  project: Project;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

export default function ProjectChat({ project }: ProjectChatProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const canPost = Boolean(user);

  const { data: messages = [] } = useQuery({
    queryKey: ["project", project.id, "chat"],
    queryFn: () => apiFetch<ChatMessage[]>(`/projects/${project.id}/chat`),
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !canPost) return;

    try {
      await apiFetch(`/projects/${project.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["project", project.id, "chat"] });
    } catch (error: any) {
      toast.error(error.message || "Не удалось отправить сообщение");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      <div className="shrink-0 mb-4">
        <h3 className="text-lg font-semibold text-foreground">Чат проекта</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Общение участников проекта
        </p>
      </div>

      <Card className="border-border/40 bg-card shadow-soft flex flex-col flex-1 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">Нет сообщений</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Напишите первое сообщение, чтобы начать обсуждение
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  <div className="flex items-center justify-center mb-4">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {dateMessages.map((msg) => {
                      const isOwn = msg.userId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md",
                            )}
                          >
                            {!isOwn && (
                              <p className="text-xs font-medium mb-1 opacity-70">{msg.userName}</p>
                            )}
                            <p className="text-sm">{msg.message}</p>
                            <p
                              className={cn(
                                "text-xs mt-1",
                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
                              )}
                            >
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border/40">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={canPost ? "Введите сообщение..." : "Чат доступен только для чтения"}
              className="flex-1"
              disabled={!canPost}
            />
            <Button onClick={handleSend} disabled={!newMessage.trim() || !canPost}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

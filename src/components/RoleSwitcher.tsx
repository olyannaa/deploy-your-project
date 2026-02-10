import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

export type UserRole =
  | "admin"
  | "gip"
  | "executor"
  | "accountant";

interface TestUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const testUsers: TestUser[] = [
  {
    id: "1",
    name: "Администратор",
    email: "admin@project.com",
    role: "admin",
  },
  {
    id: "2",
    name: "ГИП",
    email: "gip@project.com",
    role: "gip",
  },
  {
    id: "3",
    name: "Исполнитель",
    email: "executor@project.com",
    role: "executor",
  },
  {
    id: "4",
    name: "Бухгалтер",
    email: "accountant@project.com",
    role: "accountant",
  },
];

interface RoleSwitcherProps {
  onRoleChange: (role: UserRole, userName: string) => void;
}

export function RoleSwitcher({ onRoleChange }: RoleSwitcherProps) {
  const [selectedUser, setSelectedUser] = useState<string>(testUsers[0].id);

  const handleUserChange = (userId: string) => {
    setSelectedUser(userId);
    const user = testUsers.find((candidate) => candidate.id === userId);
    if (user) {
      onRoleChange(user.role, user.name);
    }
  };

  const currentUser = testUsers.find((candidate) => candidate.id === selectedUser);

  return (
    <Card className="border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">
            Текущий пользователь (демо)
          </p>
          <Select value={selectedUser} onValueChange={handleUserChange}>
            <SelectTrigger className="h-9 border-border bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {testUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Building2, 
  Bell, 
  Lock,
  Save
} from "lucide-react";
import { useState } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const isAdmin = currentRole === "admin";
  const isReadOnly = true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Настройки</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? "Управление настройками организации и личного кабинета" : "Управление настройками личного кабинета"}
        </p>
      </div>

      <Card className="border-border/40 bg-muted/40 p-4 text-sm text-muted-foreground">
        В MVP настройки доступны только для просмотра. Возможность редактирования будет добавлена позже.
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Профиль
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              Организация
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            Безопасность
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <fieldset disabled={isReadOnly} className="space-y-6">
            <Card className="border-border/40 bg-card shadow-soft">
              <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Личная информация</h3>
                <p className="text-sm text-muted-foreground">Обновите свои личные данные</p>
              </div>
              <Separator />
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">ФИО</Label>
                  <Input
                    id="fullName"
                    defaultValue={user?.fullName ?? ""}
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email ?? ""}
                    placeholder="ivan@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input id="phone" placeholder="+7 (999) 123-45-67" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Должность</Label>
                  <Input id="position" placeholder="Инженер-проектировщик" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Сохранить изменения
                </Button>
              </div>
            </div>
          </Card>
          </fieldset>
        </TabsContent>

        {/* Organization Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="organization" className="space-y-6">
            <fieldset disabled={isReadOnly} className="space-y-6">
              <Card className="border-border/40 bg-card shadow-soft">
                <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Настройки организации</h3>
                  <p className="text-sm text-muted-foreground">Управление параметрами организации</p>
                </div>
                <Separator />
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Название организации</Label>
                    <Input id="companyName" placeholder="ООО 'Строительная компания'" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyInn">ИНН</Label>
                    <Input id="companyInn" placeholder="1234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Адрес</Label>
                    <Input id="companyAddress" placeholder="г. Москва, ул. Примерная, д. 1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Телефон</Label>
                    <Input id="companyPhone" placeholder="+7 (495) 123-45-67" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    Сохранить изменения
                  </Button>
                </div>
              </div>
            </Card>
            </fieldset>
          </TabsContent>
        )}

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <fieldset disabled={isReadOnly} className="space-y-6">
            <Card className="border-border/40 bg-card shadow-soft">
              <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Настройки уведомлений</h3>
                <p className="text-sm text-muted-foreground">Управление уведомлениями о событиях</p>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Email уведомления</p>
                    <p className="text-sm text-muted-foreground">Получать уведомления на почту</p>
                  </div>
                  <Button variant="outline">Включить</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Уведомления о задачах</p>
                    <p className="text-sm text-muted-foreground">Уведомления о новых задачах и изменениях</p>
                  </div>
                  <Button variant="outline">Включить</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Уведомления о проектах</p>
                    <p className="text-sm text-muted-foreground">Уведомления о статусе проектов</p>
                  </div>
                  <Button variant="outline">Включить</Button>
                </div>
              </div>
            </div>
          </Card>
          </fieldset>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <fieldset disabled={isReadOnly} className="space-y-6">
            <Card className="border-border/40 bg-card shadow-soft">
              <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Безопасность</h3>
                <p className="text-sm text-muted-foreground">Управление паролем и безопасностью аккаунта</p>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Текущий пароль</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Новый пароль</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Изменить пароль
                </Button>
              </div>
            </div>
          </Card>
          </fieldset>
        </TabsContent>
      </Tabs>
    </div>
  );
}

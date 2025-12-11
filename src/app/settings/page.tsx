
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Separator } from "@/components/ui/separator"
import { Save } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useLocale } from "@/contexts/locale-context"

const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  avatar: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal('')),
})

export default function SettingsPage() {
  const { user, updateUser, isLoggedIn } = useAuth();
  const { t } = useLocale();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      avatar: "",
    },
  })

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    } else if (user) {
      form.reset({
        name: user.name,
        avatar: user.avatar,
      });
    }
  }, [isLoggedIn, user, router, form]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    await updateUser({ name: data.name, avatar: data.avatar || user?.avatar });
    toast({
      title: t('settingsSaved'),
      description: t('profileUpdated'),
    });
  }
  
  if (!isLoggedIn || !user) {
    return null; // or a loading spinner
  }

  return (
    <div className="container py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight font-headline">{t('settings')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('settingsSubtitle')}
        </p>
      </div>
      <div className="max-w-2xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('profileSettings')}</CardTitle>
            <CardDescription>{t('profileSettingsSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('yourName')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('avatarUrl')}</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/avatar.png" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('updateYourProfilePicture')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center space-x-4">
                  <Label>{t('role')}</Label>
                  <Input value={t(user.role)} disabled className="capitalize" />
                </div>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  {t('saveChanges')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('preferences')}</CardTitle>
            <CardDescription>{t('preferencesSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="language" className="font-bold">
                {t('language')}
              </Label>
              <LanguageSwitcher />
            </div>
            <Separator />
            <div className="flex items-center justify-between space-x-2">
                <div>
                    <Label htmlFor="notifications" className="font-bold">{t('enableNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">{t('notificationsSubtitle')}</p>
                </div>
              <Switch id="notifications" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

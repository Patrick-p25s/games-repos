
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Send } from "lucide-react"
import { useLocale } from "@/contexts/locale-context"
import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"
import Link from "next/link"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  subject: z.string().min(5, { message: "Subject must be at least 5 characters." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
})

export function FeedbackForm() {
  const { t } = useLocale();
  const { toast } = useToast()
  const { submitFeedback, user, isLoggedIn } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  })

  useEffect(() => {
    if (isLoggedIn && user) {
        form.reset({
            name: user.name,
            email: user.email,
            subject: "",
            message: "",
        })
    } else {
        form.reset({
            name: "",
            email: "",
            subject: "",
            message: "",
        })
    }
  }, [isLoggedIn, user, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await submitFeedback(values);
      toast({
        title: t('feedbackSent'),
        description: t('feedbackSentMessage'),
      })
      form.reset({
          ...form.getValues(),
          subject: '',
          message: '',
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: "Failed to send feedback. Please try again.",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('yourName')}</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} disabled={isLoggedIn} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('yourEmail')}</FormLabel>
                <FormControl>
                  <Input placeholder="john.doe@example.com" {...field} disabled={isLoggedIn} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('subject')}</FormLabel>
              <FormControl>
                <Input placeholder={t('subjectPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('message')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('messagePlaceholder')}
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={!isLoggedIn}>
          <Send className="mr-2 h-4 w-4" />
          {t('sendMessage')}
        </Button>
        {!isLoggedIn && (
            <p className="text-sm text-muted-foreground">
                {t('loginToSendFeedbackMessage')}{' '}
                <Link href="/login" className="underline hover:text-primary">
                    {t('login')}
                </Link>.
            </p>
        )}
      </form>
    </Form>
  )
}

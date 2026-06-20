import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'text' | 'danger'

type ButtonProps = {
  variant?: ButtonVariant
  children: ReactNode
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'button--primary',
  secondary: 'button--secondary',
  ghost: 'button--ghost',
  text: 'button--text',
  danger: 'button--danger',
}

export default function Button({
  variant = 'secondary',
  children,
  className,
  ...rest
}: ButtonProps) {
  const classes = ['button', variantClasses[variant]]

  if (className) {
    classes.push(className)
  }

  return (
    <button className={classes.join(' ')} {...rest}>
      {children}
    </button>
  )
}

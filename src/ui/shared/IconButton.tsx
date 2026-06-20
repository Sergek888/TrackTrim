import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import './IconButton.css'

type IconButtonVariant = 'default' | 'ghost' | 'danger'

type IconButtonProps = {
  variant?: IconButtonVariant
  children: ReactNode
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

const variantClasses: Record<IconButtonVariant, string | null> = {
  default: null,
  ghost: 'icon-button--ghost',
  danger: 'icon-button--danger',
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'default', children, className, ...rest },
  ref,
) {
  const classes = ['icon-button']
  const variantClass = variantClasses[variant]

  if (variantClass) {
    classes.push(variantClass)
  }

  if (className) {
    classes.push(className)
  }

  return (
    <button ref={ref} className={classes.join(' ')} {...rest}>
      {children}
    </button>
  )
})

export default IconButton

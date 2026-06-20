import { forwardRef, type InputHTMLAttributes } from 'react'
import './TextInput.css'

type TextInputProps = {
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, ...rest },
  ref,
) {
  const classes = ['text-input']

  if (className) {
    classes.push(className)
  }

  return <input ref={ref} className={classes.join(' ')} {...rest} />
})

export default TextInput

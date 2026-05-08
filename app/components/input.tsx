import { useFieldContext } from "../hooks/form"

export default function Input({ label }: { label: string }) {
    const { state, handleBlur, handleChange } = useFieldContext<string>()

    return (
        <div>
            <label htmlFor={label}>{label}</label>
            <input
                id={label}
                value={state.value}
                onBlur={handleBlur}
                onChange={e => handleChange(e.target.value)}
            />
        </div>
    )
}

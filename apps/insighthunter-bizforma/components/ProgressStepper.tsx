export default function ProgressStepper({ steps, current }: 
                                        { steps: string[]; current: number }) 
{ return <ol className="stepper">{steps.map((step, index) => <li key={step} 
       className={index === current ? "active" : index < current ? "done" : ""}>
       <span>{index + 1}</span><div>{step}</div></li>)}</ol>; }

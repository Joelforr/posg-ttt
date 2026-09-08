export const Help = () => {

  return (
    <div className='modal-overlay'>
        <div className='modal-content'>
            <div className='modal-accent win'>
            </div> 
            <div className='modal-body'>
                <ol className="rules">
                    <li>• Connect a line of 4</li>
                    <li>• You and your opponent will submit moves at the same time</li>
                    <li>• Moves are revealed on end of the <strong>next turn</strong></li>
                    <li>• The same move cannot be submitted twice in a row</li>
                    <li>• Permanantly lock a square by placing your symbol there twice in a row</li>
                    <li>• Squares that aren't locked can have their symbol overriden</li>
                    <li>• Revealing the same move as opponent resets the value of square</li>
                </ol>
            </div>
        </div>
    </div>
  );
}
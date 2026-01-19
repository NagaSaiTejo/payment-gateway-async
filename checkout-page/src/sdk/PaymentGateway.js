class PaymentGateway {
    constructor(options) {
        if (!options.key || !options.orderId) {
            throw new Error('Key and orderId are required');
        }
        this.options = options;
        this.baseUrl = window.location.origin; // In real world this would be static CDN URL
        this.modal = null;
    }

    open() {
        this.createModal();
        window.addEventListener('message', this.handleMessage.bind(this));
    }

    createModal() {
        const modalId = 'payment-gateway-modal';
        if (document.getElementById(modalId)) return;

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.setAttribute('data-test-id', 'payment-modal');

        // Inline styles or inject style tag
        const style = document.createElement('style');
        style.textContent = `
            #payment-gateway-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; }
            .modal-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; }
            .modal-content { position: relative; width: 95%; max-width: 450px; height: 650px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
            .modal-content iframe { width: 100%; height: 100%; border: none; }
            .close-button { position: absolute; top: 15px; right: 15px; background: #f0f0f0; border: none; width: 30px; height: 30px; border-radius: 15px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; }
        `;
        document.head.appendChild(style);

        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <button data-test-id="close-modal-button" class="close-button">×</button>
                    <iframe 
                        data-test-id="payment-iframe"
                        src="http://localhost:3001/checkout?order_id=${this.options.orderId}&embedded=true"
                    ></iframe>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;

        modal.querySelector('.close-button').onclick = () => this.close();
    }

    handleMessage(event) {
        // Caution: In production validate event.origin
        const { type, data } = event.data;
        if (type === 'payment_success') {
            if (this.options.onSuccess) this.options.onSuccess(data);
            this.close();
        } else if (type === 'payment_failed') {
            if (this.options.onFailure) this.options.onFailure(data);
        } else if (type === 'close_modal') {
            this.close();
        }
    }

    close() {
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
        }
        if (this.options.onClose) this.options.onClose();
    }
}

window.PaymentGateway = PaymentGateway;
export default PaymentGateway;
